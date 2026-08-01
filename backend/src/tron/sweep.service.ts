import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TronWeb } from 'tronweb';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { deriveTronPrivateKey, getTreasuryAddress, getTreasuryPrivateKey } from './hd-wallet.util';
import { TronUsageService } from './tron-usage.service';

const TRONGRID_BASE_URL = process.env.TRONGRID_BASE_URL || 'https://api.trongrid.io';
const TRONGRID_API_KEY = process.env.TRONGRID_API_KEY;
const USDT_TRC20_CONTRACT = process.env.USDT_TRC20_CONTRACT_ADDRESS || 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const MIN_USDT_THRESHOLD = Number(process.env.SWEEP_MIN_USDT_THRESHOLD || 1);
const GAS_FUNDING_TRX = Number(process.env.SWEEP_GAS_FUNDING_TRX || 15);
// Safety margin: a TRC20 transfer typically burns 10-15 TRX worth of
// energy/bandwidth when the sender has none staked. Fund gas whenever the
// deposit address holds less than this.
const MIN_TRX_SUN_FOR_FEE = 5_000_000; // 5 TRX

// Automatic-sweep-only safety caps (event-driven trigger + 15-min cron
// safety net — see runAutoSweep()). A manual admin trigger via
// POST /admin/sweep/run is NOT subject to these — a human already looked.
// Adjustable via env, no redeploy needed.
const SWEEP_AUTO_MAX_USDT_PER_ADDRESS = Number(process.env.SWEEP_AUTO_MAX_USDT_PER_ADDRESS || 250);
const SWEEP_AUTO_MAX_TOTAL_USDT_PER_CYCLE = Number(process.env.SWEEP_AUTO_MAX_TOTAL_USDT_PER_CYCLE || 1000);

// Explicit pacing between candidates on real (non-dry-run) sweeps, on top of
// the natural latency of each candidate's own sequential TronGrid calls —
// same discipline as TronMonitorService's per-address polling: don't rely
// on incidental latency to stay under TronGrid's confirmed 15 req/s ceiling.
const INTER_CANDIDATE_DELAY_MS = 400;

export interface SweepResult {
  dryRun: boolean;
  addressesSwept: number;
  totalUsdtCollected: number;
  errors: string[];
  skippedOverCap: string[];
  haltedOverTotalCap: boolean;
}

@Injectable()
export class SweepService {
  private readonly logger = new Logger(SweepService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly tronUsageService: TronUsageService,
  ) {}

  // Manual trigger (SweepController, CEO-only) — unchanged behavior: throws
  // if a sweep is already in flight, and ignores the auto-sweep caps since a
  // human explicitly requested it (and can review a dry-run first).
  async runSweep(dryRun: boolean): Promise<SweepResult> {
    if (this.running) {
      throw new ConflictException('Yon sweep deja ap egzekite — tann li fini anvan ou lanse yon lòt.');
    }
    this.running = true;
    try {
      return await this.executeSweep(dryRun, false);
    } finally {
      this.running = false;
    }
  }

  // Automatic trigger — called (a) fire-and-forget right after
  // TronMonitorService credits a deposit, and (b) every 15 minutes as a
  // safety net (scheduledSweepSafetyNet below) in case an event-driven call
  // was missed (transient error, process restart, etc). Unlike runSweep(),
  // never throws on "already running" — automatic callers just skip this
  // round; the next trigger (event or cron) picks up any candidate left
  // behind. Enforces the per-address and per-cycle USDT caps.
  async runAutoSweep(): Promise<SweepResult | null> {
    if (this.running) {
      this.logger.debug('runAutoSweep: yon sweep deja ap egzekite — sote pou fwa sa a, pwochen deklanchman ap ratrape l.');
      return null;
    }
    this.running = true;
    try {
      return await this.executeSweep(false, true);
    } finally {
      this.running = false;
    }
  }

  @Cron('*/15 * * * *')
  private async scheduledSweepSafetyNet(): Promise<void> {
    try {
      await this.runAutoSweep();
    } catch (err: any) {
      this.logger.error(`scheduledSweepSafetyNet echwe: ${err.message}`);
    }
  }

  private async executeSweep(dryRun: boolean, enforceAutoCaps: boolean): Promise<SweepResult> {
    const errors: string[] = [];
    const skippedOverCap: string[] = [];
    let addressesSwept = 0;
    let totalUsdtCollected = 0;
    let haltedOverTotalCap = false;

    const treasuryAddress = getTreasuryAddress();

    // Candidate list from DB first — cheaper than scanning every
    // DepositAddress on-chain. Only addresses that have at least one
    // CREDITED deposit and no COMPLETED sweep yet are worth checking.
    const candidates = await this.prisma.depositAddress.findMany({
      where: {
        deposits: { some: { status: 'CREDITED' } },
        sweeps: { none: { status: 'COMPLETED' } },
      },
      select: { id: true, address: true, derivationIndex: true },
    });

    for (const candidate of candidates) {
      try {
        // Second, authoritative check: real on-chain balance, not the DB.
        const { trxBalanceSun, usdtBalanceRaw } = await this.getAccountInfo(candidate.address);
        const usdtBalance = Number(usdtBalanceRaw) / 1_000_000;

        if (usdtBalance < MIN_USDT_THRESHOLD) continue;

        if (enforceAutoCaps && usdtBalance > SWEEP_AUTO_MAX_USDT_PER_ADDRESS) {
          this.logger.warn(
            `Sweep otomatik sote pou ${candidate.address}: balans $${usdtBalance} depase plafon pa-adrès $${SWEEP_AUTO_MAX_USDT_PER_ADDRESS} — bezwen deklanchman manyèl (POST /admin/sweep/run).`,
          );
          skippedOverCap.push(candidate.address);
          continue;
        }

        if (enforceAutoCaps && totalUsdtCollected + usdtBalance > SWEEP_AUTO_MAX_TOTAL_USDT_PER_CYCLE) {
          haltedOverTotalCap = true;
          this.logger.warn(
            `Sweep otomatik sispann sik la: total ta rive $${(totalUsdtCollected + usdtBalance).toFixed(2)}, depase plafon $${SWEEP_AUTO_MAX_TOTAL_USDT_PER_CYCLE} — rès kandida yo ap tann pwochen deklanchman.`,
          );
          try {
            await this.mailService.sendSystemAlert(
              `Sweep otomatik sispann: total sik la ta rive $${(totalUsdtCollected + usdtBalance).toFixed(2)} USDT, depase plafon SWEEP_AUTO_MAX_TOTAL_USDT_PER_CYCLE ($${SWEEP_AUTO_MAX_TOTAL_USDT_PER_CYCLE}). Verifye kandida yo epi deklanche manyèlman si sa nesesè (POST /admin/sweep/run).`,
              Math.round(process.uptime()),
            );
          } catch {}
          break;
        }

        if (dryRun) {
          addressesSwept++;
          totalUsdtCollected += usdtBalance;
          continue;
        }

        let sweep = await this.prisma.sweepTransaction.findFirst({
          where: { depositAddressId: candidate.id, status: 'PENDING' },
        });
        if (!sweep) {
          sweep = await this.prisma.sweepTransaction.create({
            data: { depositAddressId: candidate.id, amountUsdt: usdtBalance, status: 'PENDING' },
          });
        }

        if (trxBalanceSun < MIN_TRX_SUN_FOR_FEE) {
          if (!sweep.gasFundingTxHash) {
            const fundTxHash = await this.sendTrx(getTreasuryPrivateKey(), candidate.address, GAS_FUNDING_TRX);
            sweep = await this.prisma.sweepTransaction.update({
              where: { id: sweep.id },
              data: { gasFundingTxHash: fundTxHash },
            });
            this.logger.log(`Finanse gaz pou ${candidate.address}: ${fundTxHash}`);
          }
          await this.waitForTrxLanding(candidate.address, MIN_TRX_SUN_FOR_FEE);
        }

        const privateKey = deriveTronPrivateKey(candidate.derivationIndex);
        const txHash = await this.sendUsdt(privateKey, treasuryAddress, usdtBalanceRaw);

        await this.prisma.sweepTransaction.update({
          where: { id: sweep.id },
          data: { txHash, status: 'COMPLETED', sweptAt: new Date(), amountUsdt: usdtBalance },
        });

        this.logger.log(`Sweep konplete pou ${candidate.address}: ${usdtBalance} USDT → ${txHash}`);
        addressesSwept++;
        totalUsdtCollected += usdtBalance;
      } catch (err: any) {
        this.logger.error(`Sweep echwe pou adrès ${candidate.address}: ${err.message}`);
        errors.push(`${candidate.address}: ${err.message}`);
        if (!dryRun) {
          await this.prisma.sweepTransaction
            .updateMany({
              where: { depositAddressId: candidate.id, status: 'PENDING' },
              data: { status: 'FAILED' },
            })
            .catch(() => {});
        }
      }

      if (!dryRun) await this.sleep(INTER_CANDIDATE_DELAY_MS);
    }

    return {
      dryRun,
      addressesSwept,
      totalUsdtCollected: Math.round(totalUsdtCollected * 1_000_000) / 1_000_000,
      errors,
      skippedOverCap,
      haltedOverTotalCap,
    };
  }

  private getTronWeb(privateKey?: string): TronWeb {
    return new TronWeb({
      fullHost: TRONGRID_BASE_URL,
      headers: TRONGRID_API_KEY ? { 'TRON-PRO-API-KEY': TRONGRID_API_KEY } : undefined,
      privateKey,
    });
  }

  private async getAccountInfo(address: string): Promise<{ trxBalanceSun: number; usdtBalanceRaw: bigint }> {
    const res = await fetch(`${TRONGRID_BASE_URL}/v1/accounts/${address}`, {
      headers: TRONGRID_API_KEY ? { 'TRON-PRO-API-KEY': TRONGRID_API_KEY } : {},
    });
    await this.tronUsageService.recordCall();
    if (!res.ok) throw new Error(`TronGrid accounts HTTP ${res.status}`);
    const data = await res.json();
    const acct = data?.data?.[0];
    const trxBalanceSun = Number(acct?.balance || 0);

    let usdtBalanceRaw = 0n;
    const trc20List: Array<Record<string, string>> = acct?.trc20 || [];
    for (const entry of trc20List) {
      if (entry[USDT_TRC20_CONTRACT]) {
        usdtBalanceRaw = BigInt(entry[USDT_TRC20_CONTRACT]);
        break;
      }
    }
    return { trxBalanceSun, usdtBalanceRaw };
  }

  private async waitForTrxLanding(address: string, minSun: number, attempts = 5, delayMs = 3000): Promise<void> {
    for (let i = 0; i < attempts; i++) {
      const { trxBalanceSun } = await this.getAccountInfo(address);
      if (trxBalanceSun >= minSun) return;
      await this.sleep(delayMs);
    }
    throw new Error('TRX finansman gaz la poko rive apre plizyè tantativ — eseye sweep la ankò pita');
  }

  // TronWeb SDK calls internally issue multiple HTTP requests we can't
  // intercept individually — recordCall() below uses counts empirically
  // measured 2026-08-01 (build + broadcast for sendTrx; ABI fetch + build +
  // broadcast for sendUsdt), close enough for quota visibility even though
  // it can't reflect internal retries exactly.
  private async sendTrx(fromPrivateKey: string, toAddress: string, amountTrx: number): Promise<string> {
    const tronWeb = this.getTronWeb();
    const amountSun = Math.round(amountTrx * 1_000_000);
    const result = await tronWeb.trx.sendTrx(toAddress, amountSun, { privateKey: fromPrivateKey });
    await this.tronUsageService.recordCall(2);
    if (!result.result) throw new Error(`TRX funding tranzaksyon rejte: ${result.message}`);
    return result.txid;
  }

  private async sendUsdt(fromPrivateKey: string, toAddress: string, rawAmount: bigint): Promise<string> {
    const tronWeb = this.getTronWeb(fromPrivateKey);
    const contract: any = await tronWeb.contract().at(USDT_TRC20_CONTRACT);
    const txId: string = await contract.transfer(toAddress, rawAmount.toString()).send({ feeLimit: 50_000_000 });
    await this.tronUsageService.recordCall(3);
    if (!txId) throw new Error('USDT transfer echwe — pa gen txId retounen');
    return txId;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
