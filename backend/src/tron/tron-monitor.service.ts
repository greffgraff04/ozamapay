import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

const TRONGRID_BASE_URL = process.env.TRONGRID_BASE_URL || 'https://api.trongrid.io';
const TRONGRID_API_KEY = process.env.TRONGRID_API_KEY;
// Mainnet USDT TRC20 contract — override via env for testnet/shadownet.
const USDT_TRC20_CONTRACT = process.env.USDT_TRC20_CONTRACT_ADDRESS || 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const MIN_CONFIRMATIONS = Number(process.env.USDT_MIN_CONFIRMATIONS || 20);
const TRON_BLOCK_TIME_MS = 3000;

// Empirically confirmed 2026-07-31: TronGrid rejects bursts above ~15 req/s
// per key with HTTP 429 "exceeds the frequency limit(15)". This interval
// paces individual request STARTS (not batches — a Promise.all burst of
// even 40 requests instantly blows the ceiling) at ~7.7 req/s, leaving
// headroom shared with SweepService's occasional admin-triggered calls.
const REQUEST_INTERVAL_MS = 130;

// Always re-query slightly before an address's last-checked watermark so a
// transaction landing right at the boundary (TronGrid indexing lag, clock
// skew) can never be silently skipped. Safe to overlap — txHash dedup in
// handleTransfer() makes re-seeing the same transfer a no-op.
const SAFETY_BUFFER_MS = 60_000;

const MAX_PAGES_PER_ADDRESS = 5;

type DepositAddrLite = {
  id: string;
  address: string;
  userId: string;
  createdAt: Date;
  lastPolledAt: Date | null;
};

@Injectable()
export class TronMonitorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TronMonitorService.name);
  private stopped = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  onModuleInit(): void {
    // Fire-and-forget: this loop runs for the lifetime of the process.
    this.runForever().catch((err) => this.logger.error(`TronMonitor loop kraze: ${err.message}`));
  }

  onModuleDestroy(): void {
    this.stopped = true;
  }

  // Continuously cycles through every DepositAddress, checking each one
  // INDIVIDUALLY via /accounts/{address}/transactions/trc20 — never a
  // shared global event feed. Each address carries its own lastPolledAt
  // watermark, so a deposit can never be silently skipped, only detected
  // late if the address hasn't had its turn yet in the rotation.
  //
  // Replaces the earlier design (single global "200 most recent Transfer
  // events on the whole USDT contract" poll every 45s), which was found to
  // cover only ~9s of real time per call on live mainnet USDT traffic —
  // meaning most deposits were never seen at all, and the rare one that was
  // seen almost never resurfaced in a later poll to accumulate the
  // confirmations needed to credit it. See audit dated 2026-07-31.
  private async runForever(): Promise<void> {
    while (!this.stopped) {
      let addresses: DepositAddrLite[] = [];
      try {
        addresses = await this.prisma.depositAddress.findMany({
          select: { id: true, address: true, userId: true, createdAt: true, lastPolledAt: true },
        });
      } catch (err: any) {
        this.logger.error(`TronMonitor: pa ka li DepositAddress yo: ${err.message}`);
        await this.sleep(5000);
        continue;
      }

      if (addresses.length === 0) {
        await this.sleep(5000);
        continue;
      }

      for (const addr of addresses) {
        if (this.stopped) return;
        const reqStart = Date.now();

        try {
          await this.pollOneAddress(addr);
        } catch (err: any) {
          this.logger.error(`Tcheke adrès ${addr.address} echwe: ${err.message}`);
        }

        const wait = REQUEST_INTERVAL_MS - (Date.now() - reqStart);
        if (wait > 0) await this.sleep(wait);
      }
    }
  }

  private async pollOneAddress(addr: DepositAddrLite): Promise<void> {
    const sinceMs = (addr.lastPolledAt ?? addr.createdAt).getTime() - SAFETY_BUFFER_MS;
    const pollStartedAt = new Date();

    const transfers = await this.fetchTransfersTo(addr.address, sinceMs);
    for (const t of transfers) {
      try {
        await this.handleTransfer(t, addr.id, addr.userId);
      } catch (err: any) {
        this.logger.error(`Erè nan trete transfè ${t?.transaction_id} pou ${addr.address}: ${err.message}`);
      }
    }

    // Advance the watermark even when nothing was found — this is what
    // guarantees we never re-scan an address's full history on every tick.
    await this.prisma.depositAddress.update({
      where: { id: addr.id },
      data: { lastPolledAt: pollStartedAt },
    });
  }

  private async fetchTransfersTo(address: string, sinceMs: number): Promise<any[]> {
    const results: any[] = [];
    let fingerprint: string | undefined;
    let pages = 0;

    while (pages < MAX_PAGES_PER_ADDRESS) {
      const params = new URLSearchParams({
        limit: '200',
        contract_address: USDT_TRC20_CONTRACT,
        only_to: 'true',
        only_confirmed: 'true',
        order_by: 'block_timestamp,desc',
        min_timestamp: String(sinceMs),
      });
      if (fingerprint) params.set('fingerprint', fingerprint);

      const res = await fetch(
        `${TRONGRID_BASE_URL}/v1/accounts/${address}/transactions/trc20?${params.toString()}`,
        { headers: TRONGRID_API_KEY ? { 'TRON-PRO-API-KEY': TRONGRID_API_KEY } : {} },
      );
      if (!res.ok) throw new Error(`TronGrid accounts/trc20 HTTP ${res.status}`);

      const data = await res.json();
      const page: any[] = Array.isArray(data?.data) ? data.data : [];
      results.push(...page);
      pages++;

      fingerprint = data?.meta?.fingerprint;
      if (page.length < 200 || !fingerprint) break;
    }

    if (pages >= MAX_PAGES_PER_ADDRESS) {
      this.logger.warn(`fetchTransfersTo ${address}: rive nan MAX_PAGES_PER_ADDRESS (${MAX_PAGES_PER_ADDRESS}) — gendwa gen plis done ki pa rekipere`);
    }

    return results;
  }

  private async handleTransfer(t: any, depositAddressId: string, userId: string): Promise<void> {
    const txHash: string | undefined = t?.transaction_id;
    const rawValue = t?.value;
    if (!txHash || rawValue === undefined) return;

    const decimals = Number(t?.token_info?.decimals ?? 6);
    const amountUsdt = Number(rawValue) / 10 ** decimals;
    if (!Number.isFinite(amountUsdt) || amountUsdt <= 0) return;

    const blockTimestamp = Number(t?.block_timestamp);
    const ageMs = Number.isFinite(blockTimestamp) ? Date.now() - blockTimestamp : 0;
    const confirmations = Math.max(0, Math.floor(ageMs / TRON_BLOCK_TIME_MS));

    let deposit = await this.prisma.cryptoDeposit.findUnique({ where: { txHash } });

    if (!deposit) {
      deposit = await this.prisma.cryptoDeposit.create({
        data: {
          depositAddressId,
          txHash,
          amountUsdt,
          confirmations,
          status: confirmations > 0 ? 'CONFIRMED' : 'PENDING',
        },
      });
    } else if (deposit.status === 'PENDING' || deposit.status === 'CONFIRMED') {
      deposit = await this.prisma.cryptoDeposit.update({
        where: { id: deposit.id },
        data: { confirmations, status: confirmations > 0 ? 'CONFIRMED' : deposit.status },
      });
    } else {
      return; // already CREDITED or FAILED — nothing left to do
    }

    if (confirmations >= MIN_CONFIRMATIONS) {
      await this.creditDeposit(deposit.id, txHash, userId, amountUsdt);
    }
  }

  // Atomic claim (mirrors MonCashConnectService.processWebhookPayment):
  // updateMany with a status filter guarantees only one concurrent poll
  // cycle can win the claim, so no deposit is ever credited twice.
  private async creditDeposit(
    depositId: string,
    txHash: string,
    userId: string,
    amountUsdt: number,
  ): Promise<void> {
    const claimed = await this.prisma.cryptoDeposit.updateMany({
      where: { id: depositId, status: { in: ['PENDING', 'CONFIRMED'] } },
      data: { status: 'CREDITED' },
    });
    if (claimed.count === 0) return;

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      this.logger.error(`creditDeposit: pa gen wallet pou userId=${userId} (deposit=${depositId})`);
      await this.prisma.cryptoDeposit.update({ where: { id: depositId }, data: { status: 'FAILED' } });
      return;
    }

    const rate = await this.getUsdtHtgRate();
    const amountHTG = Math.round(amountUsdt * rate * 100) / 100;
    const reference = `USDT-${uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase()}`;

    try {
      const [, transaction] = await this.prisma.$transaction([
        this.prisma.wallet.update({ where: { userId }, data: { balance: { increment: amountHTG } } }),
        this.prisma.transaction.create({
          data: {
            reference,
            receiverWalletId: wallet.id,
            amount: amountHTG,
            fee: 0,
            netAmount: amountHTG,
            type: 'TOPUP',
            status: 'COMPLETED',
            method: 'USDT-TRC20',
            title: `Depot USDT (TRC20) — ${amountUsdt} USDT (${amountHTG} HTG)`,
            description: `TxHash: ${txHash}`,
          },
        }),
      ]);

      await this.prisma.cryptoDeposit.update({
        where: { id: depositId },
        data: { transactionId: transaction.id, creditedAt: new Date() },
      });

      this.logger.log(`USDT deposit ${depositId} kredite: +${amountHTG} HTG pou userId=${userId}`);

      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        try {
          await this.mailService.sendTopupConfirmed(user.email, user.name ?? 'Kliyan', amountHTG, 'USDT (TRC20)');
        } catch {}
      }
    } catch (err: any) {
      this.logger.error(`creditDeposit echwe pou deposit=${depositId}: ${err.message}`);
      // Revert the claim so the next poll cycle retries the credit.
      await this.prisma.cryptoDeposit
        .update({ where: { id: depositId }, data: { status: 'CONFIRMED' } })
        .catch(() => {});
    }
  }

  private async getUsdtHtgRate(): Promise<number> {
    const entry = await this.prisma.rate.findUnique({ where: { key: 'USDT_HTG' } });
    return Number(entry?.value || 140);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
