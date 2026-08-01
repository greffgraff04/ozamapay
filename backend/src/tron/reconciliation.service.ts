import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { getTreasuryAddress } from './hd-wallet.util';

const TRONGRID_BASE_URL = process.env.TRONGRID_BASE_URL || 'https://api.trongrid.io';
const TRONGRID_API_KEY = process.env.TRONGRID_API_KEY;
const USDT_TRC20_CONTRACT = process.env.USDT_TRC20_CONTRACT_ADDRESS || 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

// Small tolerance for decimal rounding residue — not a real discrepancy.
const RECONCILIATION_TOLERANCE_USDT = Number(process.env.RECONCILIATION_TOLERANCE_USDT || 0.01);

// This job runs once a day (or occasionally on-demand), not continuously —
// no need for the monitor loop's tight 1250ms/quota-driven pacing. ~500
// calls at this interval take ~3-4 minutes, trivial against the ~30,000/day
// margin left after TronMonitorService's budget.
const RECONCILIATION_REQUEST_INTERVAL_MS = Number(process.env.RECONCILIATION_REQUEST_INTERVAL_MS || 400);

export interface ReconciliationResult {
  checkedAt: Date;
  addressesChecked: number;
  addressesFailed: string[];
  complete: boolean;
  onChainTotalUsdt: number;
  dbCreditedTotalUsdt: number;
  differenceUsdt: number;
  withinTolerance: boolean;
}

// Verification only — never writes to Wallet, CryptoDeposit, or
// SweepTransaction. Compares total USDT actually held on-chain (every
// DepositAddress + the treasury — a sum that's invariant to whether any
// given deposit has been swept yet, since both sides of that internal
// move are included) against the total we ever credited
// (SUM(CryptoDeposit.amountUsdt) WHERE status='CREDITED'). Deliberately
// NOT compared against Wallet.balance — that field commingles USDT
// deposits with MonCash top-ups, card spend, P2P transfers, etc., so it
// would show a permanent, meaningless "discrepancy" as soon as any user
// spends their balance. Confirmed with the business (2026-08-01): the
// treasury is deposit-only today, no manual withdrawals — if that changes,
// this needs a tracked-withdrawals ledger to stay accurate.
@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  @Cron('0 6 * * *')
  private async scheduledReconciliation(): Promise<void> {
    try {
      await this.runReconciliation();
    } catch (err: any) {
      this.logger.error(`scheduledReconciliation echwe: ${err.message}`);
    }
  }

  async runReconciliation(): Promise<ReconciliationResult> {
    const checkedAt = new Date();

    const addresses = await this.prisma.depositAddress.findMany({ select: { address: true } });
    const treasuryAddress = getTreasuryAddress();
    const targets = [...addresses.map((a) => a.address), treasuryAddress];

    let onChainTotalUsdt = 0;
    const addressesFailed: string[] = [];

    for (const address of targets) {
      const reqStart = Date.now();
      try {
        onChainTotalUsdt += await this.getUsdtBalance(address);
      } catch (err: any) {
        this.logger.error(`Rekonsilyasyon: pa ka verifye ${address}: ${err.message}`);
        addressesFailed.push(address);
      }
      const wait = RECONCILIATION_REQUEST_INTERVAL_MS - (Date.now() - reqStart);
      if (wait > 0) await this.sleep(wait);
    }

    const creditedAgg = await this.prisma.cryptoDeposit.aggregate({
      where: { status: 'CREDITED' },
      _sum: { amountUsdt: true },
    });
    const dbCreditedTotalUsdt = Number(creditedAgg._sum.amountUsdt || 0);

    const complete = addressesFailed.length === 0;
    const differenceUsdt = Math.round((onChainTotalUsdt - dbCreditedTotalUsdt) * 1_000_000) / 1_000_000;
    const withinTolerance = Math.abs(differenceUsdt) <= RECONCILIATION_TOLERANCE_USDT;

    const result: ReconciliationResult = {
      checkedAt,
      addressesChecked: targets.length - addressesFailed.length,
      addressesFailed,
      complete,
      onChainTotalUsdt: Math.round(onChainTotalUsdt * 1_000_000) / 1_000_000,
      dbCreditedTotalUsdt: Math.round(dbCreditedTotalUsdt * 1_000_000) / 1_000_000,
      differenceUsdt,
      withinTolerance,
    };

    // Incomplete takes priority over the totals — an address we couldn't
    // check must never be silently treated as $0, or a normal API hiccup
    // would look exactly like missing funds.
    if (!complete) {
      this.logger.warn(`Rekonsilyasyon ENKOMPLÈ: ${addressesFailed.length} adrès pa verifye — rezilta pa fyab.`);
      try {
        await this.mailService.sendSystemAlert(
          `Rekonsilyasyon USDT ENKOMPLÈ: ${addressesFailed.length} adrès pa ka verifye ` +
            `(${addressesFailed.slice(0, 10).join(', ')}${addressesFailed.length > 10 ? '...' : ''}). ` +
            `Rezilta pa fyab — eseye ankò (GET /admin/reconciliation/run).`,
          Math.round(process.uptime()),
        );
      } catch {}
    } else if (!withinTolerance) {
      this.logger.error(
        `Rekonsilyasyon DISKREPANS: on-chain=$${result.onChainTotalUsdt} BDD=$${result.dbCreditedTotalUsdt} diferans=$${differenceUsdt}`,
      );
      try {
        await this.mailService.sendSystemAlert(
          `Rekonsilyasyon USDT DISKREPANS: balans on-chain total = $${result.onChainTotalUsdt}, ` +
            `total kredite nan BDD = $${result.dbCreditedTotalUsdt}, diferans = $${differenceUsdt} ` +
            `(${result.addressesChecked} adrès verifye). Envestige imedyatman.`,
          Math.round(process.uptime()),
        );
      } catch {}
    } else {
      this.logger.log(
        `Rekonsilyasyon OK: on-chain=$${result.onChainTotalUsdt} BDD=$${result.dbCreditedTotalUsdt} (${result.addressesChecked} adrès verifye)`,
      );
    }

    return result;
  }

  private async getUsdtBalance(address: string): Promise<number> {
    const res = await fetch(`${TRONGRID_BASE_URL}/v1/accounts/${address}`, {
      headers: TRONGRID_API_KEY ? { 'TRON-PRO-API-KEY': TRONGRID_API_KEY } : {},
    });
    if (!res.ok) throw new Error(`TronGrid accounts HTTP ${res.status}`);
    const data = await res.json();
    const acct = data?.data?.[0];
    const trc20List: Array<Record<string, string>> = acct?.trc20 || [];
    for (const entry of trc20List) {
      if (entry[USDT_TRC20_CONTRACT]) {
        return Number(BigInt(entry[USDT_TRC20_CONTRACT])) / 1_000_000;
      }
    }
    return 0;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
