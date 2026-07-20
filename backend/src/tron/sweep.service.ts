import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { TronWeb } from 'tronweb';
import { PrismaService } from '../prisma/prisma.service';
import { deriveTronPrivateKey, getTreasuryAddress, getTreasuryPrivateKey } from './hd-wallet.util';

const TRONGRID_BASE_URL = process.env.TRONGRID_BASE_URL || 'https://api.trongrid.io';
const TRONGRID_API_KEY = process.env.TRONGRID_API_KEY;
const USDT_TRC20_CONTRACT = process.env.USDT_TRC20_CONTRACT_ADDRESS || 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const MIN_USDT_THRESHOLD = Number(process.env.SWEEP_MIN_USDT_THRESHOLD || 1);
const GAS_FUNDING_TRX = Number(process.env.SWEEP_GAS_FUNDING_TRX || 15);
// Safety margin: a TRC20 transfer typically burns 10-15 TRX worth of
// energy/bandwidth when the sender has none staked. Fund gas whenever the
// deposit address holds less than this.
const MIN_TRX_SUN_FOR_FEE = 5_000_000; // 5 TRX

export interface SweepResult {
  dryRun: boolean;
  addressesSwept: number;
  totalUsdtCollected: number;
  errors: string[];
}

@Injectable()
export class SweepService {
  private readonly logger = new Logger(SweepService.name);
  private running = false;

  constructor(private readonly prisma: PrismaService) {}

  async runSweep(dryRun: boolean): Promise<SweepResult> {
    if (this.running) {
      throw new ConflictException('Yon sweep deja ap egzekite — tann li fini anvan ou lanse yon lòt.');
    }
    this.running = true;

    const errors: string[] = [];
    let addressesSwept = 0;
    let totalUsdtCollected = 0;

    try {
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
      }

      return {
        dryRun,
        addressesSwept,
        totalUsdtCollected: Math.round(totalUsdtCollected * 1_000_000) / 1_000_000,
        errors,
      };
    } finally {
      this.running = false;
    }
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
      await new Promise((r) => setTimeout(r, delayMs));
    }
    throw new Error('TRX finansman gaz la poko rive apre plizyè tantativ — eseye sweep la ankò pita');
  }

  private async sendTrx(fromPrivateKey: string, toAddress: string, amountTrx: number): Promise<string> {
    const tronWeb = this.getTronWeb();
    const amountSun = Math.round(amountTrx * 1_000_000);
    const result = await tronWeb.trx.sendTrx(toAddress, amountSun, { privateKey: fromPrivateKey });
    if (!result.result) throw new Error(`TRX funding tranzaksyon rejte: ${result.message}`);
    return result.txid;
  }

  private async sendUsdt(fromPrivateKey: string, toAddress: string, rawAmount: bigint): Promise<string> {
    const tronWeb = this.getTronWeb(fromPrivateKey);
    const contract: any = await tronWeb.contract().at(USDT_TRC20_CONTRACT);
    const txId: string = await contract.transfer(toAddress, rawAmount.toString()).send({ feeLimit: 50_000_000 });
    if (!txId) throw new Error('USDT transfer echwe — pa gen txId retounen');
    return txId;
  }
}
