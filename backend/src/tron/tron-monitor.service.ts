import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { v4 as uuidv4 } from 'uuid';
import { TronWeb } from 'tronweb';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

const TRONGRID_BASE_URL = process.env.TRONGRID_BASE_URL || 'https://api.trongrid.io';
const TRONGRID_API_KEY = process.env.TRONGRID_API_KEY;
// Mainnet USDT TRC20 contract — override via env for testnet/shadownet.
const USDT_TRC20_CONTRACT = process.env.USDT_TRC20_CONTRACT_ADDRESS || 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const MIN_CONFIRMATIONS = Number(process.env.USDT_MIN_CONFIRMATIONS || 20);

type DepositAddrLite = { id: string; address: string; userId: string };

@Injectable()
export class TronMonitorService {
  private readonly logger = new Logger(TronMonitorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  // Runs every 45s. Makes ONE call to TronGrid for all Transfer events on
  // the USDT contract (not one call per deposit address), then matches
  // events against our known DepositAddress rows in memory.
  @Cron('*/45 * * * * *')
  async pollDeposits(): Promise<void> {
    try {
      const addresses = await this.prisma.depositAddress.findMany({
        select: { id: true, address: true, userId: true },
      });
      if (addresses.length === 0) return;

      const byAddress = new Map<string, DepositAddrLite>(addresses.map((a) => [a.address, a]));

      const [events, currentBlock] = await Promise.all([
        this.fetchUsdtTransferEvents(),
        this.getCurrentBlockNumber(),
      ]);

      for (const ev of events) {
        try {
          await this.handleEvent(ev, byAddress, currentBlock);
        } catch (err: any) {
          this.logger.error(`Erè nan trete evènman ${ev?.transaction_id}: ${err.message}`);
        }
      }
    } catch (err: any) {
      this.logger.error(`TronMonitor pollDeposits echwe: ${err.message}`);
    }
  }

  private async handleEvent(
    ev: any,
    byAddress: Map<string, DepositAddrLite>,
    currentBlock: number,
  ): Promise<void> {
    const to = this.normalizeAddress(ev?.result?.to);
    const depositAddr = to ? byAddress.get(to) : undefined;
    if (!depositAddr) return;

    const txHash: string | undefined = ev.transaction_id;
    const rawValue = ev?.result?.value;
    if (!txHash || rawValue === undefined) return;

    const amountUsdt = Number(rawValue) / 1_000_000; // USDT TRC20 has 6 decimals
    if (!Number.isFinite(amountUsdt) || amountUsdt <= 0) return;

    const confirmations = Math.max(0, currentBlock - Number(ev.block_number ?? currentBlock));

    let deposit = await this.prisma.cryptoDeposit.findUnique({ where: { txHash } });

    if (!deposit) {
      deposit = await this.prisma.cryptoDeposit.create({
        data: {
          depositAddressId: depositAddr.id,
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
      await this.creditDeposit(deposit.id, txHash, depositAddr.userId, amountUsdt);
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

  private normalizeAddress(addr: string | undefined): string | undefined {
    if (!addr) return undefined;
    if (addr.startsWith('T')) return addr;
    try {
      const hex = addr.startsWith('41') ? addr : `41${addr}`;
      return TronWeb.address.fromHex(hex);
    } catch {
      return addr;
    }
  }

  private async fetchUsdtTransferEvents(): Promise<any[]> {
    const url =
      `${TRONGRID_BASE_URL}/v1/contracts/${USDT_TRC20_CONTRACT}/events` +
      `?event_name=Transfer&only_confirmed=true&limit=200&order_by=block_timestamp,desc`;
    const res = await fetch(url, {
      headers: TRONGRID_API_KEY ? { 'TRON-PRO-API-KEY': TRONGRID_API_KEY } : {},
    });
    if (!res.ok) throw new Error(`TronGrid events HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data?.data) ? data.data : [];
  }

  private async getCurrentBlockNumber(): Promise<number> {
    const res = await fetch(`${TRONGRID_BASE_URL}/wallet/getnowblock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(TRONGRID_API_KEY ? { 'TRON-PRO-API-KEY': TRONGRID_API_KEY } : {}),
      },
      body: JSON.stringify({}),
    });
    if (!res.ok) throw new Error(`TronGrid getnowblock HTTP ${res.status}`);
    const data = await res.json();
    const num = data?.block_header?.raw_data?.number;
    if (typeof num !== 'number') throw new Error('TronGrid getnowblock: rezilta inatandi');
    return num;
  }
}
