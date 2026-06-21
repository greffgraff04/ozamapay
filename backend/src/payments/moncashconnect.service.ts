import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

const BASE_URL = 'https://hvlmeoqyxaguzcujpmit.supabase.co/functions/v1';
const FEE_RATE = 0.089; // 6% OZAMAPAY + 2.9% MonCash processing
const MASTER_ID = process.env.OZAMAPAY_MASTER_ID as string;
// Transactions older than this are considered abandoned and eligible for expiry
const STALE_MINUTES = 15;

@Injectable()
export class MonCashConnectService {
  private readonly logger = new Logger(MonCashConnectService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async createPaymentRequest(
    userId: string,
    amountHTG: number,
  ): Promise<{ paymentUrl: string; referenceId: string }> {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const existingWallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (existingWallet) {
      const existing = await this.prisma.transaction.findFirst({
        where: {
          receiverWalletId: existingWallet.id,
          type: 'TOPUP',
          status: 'PENDING',
          method: 'MonCash',
          createdAt: { gte: tenMinutesAgo },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (existing?.description) {
        this.logger.log(`Idempotency hit for userId ${userId} — returning existing transaction`);
        return { paymentUrl: existing.description, referenceId: existing.reference };
      }
    }

    const referenceId = `ozama_${userId}_${Date.now()}`;

    let data: any;
    try {
      const res = await fetch(`${BASE_URL}/pay-create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.MONCASHCONNECT_SECRET_KEY}`,
        },
        body: JSON.stringify({
          amount: amountHTG,
          referenceId,
          returnUrl: 'https://ozamapay.com/dashboard',
        }),
      });

      data = await res.json();

      if (!res.ok) {
        this.logger.error(`MonCashConnect pay-create failed: ${JSON.stringify(data)}`);
        throw new BadRequestException('Nou rankontre yon pwoblèm teknik. Tanpri eseye ankò pita oswa kontakte sipò OZAMAPAY.');
      }
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error(`MonCashConnect pay-create error: ${(err as Error).message}`);
      throw new BadRequestException('Nou rankontre yon pwoblèm teknik. Tanpri eseye ankò pita oswa kontakte sipò OZAMAPAY.');
    }

    const paymentUrl: string = data.paymentUrl ?? data.payment_url ?? data.url ?? '';
    const monCashRef: string = data.reference ?? data.referenceId ?? data.reference_id ?? referenceId;

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (wallet) {
      const fee = Math.round(amountHTG * FEE_RATE * 100) / 100;
      const netAmount = Math.round((amountHTG - fee) * 100) / 100;

      try {
        await this.prisma.transaction.create({
          data: {
            reference: monCashRef,
            amount: amountHTG,
            netAmount,
            fee,
            type: 'TOPUP',
            status: 'PENDING',
            method: 'MonCash',
            title: `Depot MonCash — ${amountHTG} HTG`,
            description: paymentUrl,
            receiverWalletId: wallet.id,
          },
        });
      } catch (err: any) {
        this.logger.error(`MonCashConnect createPaymentRequest DB error: ${err.message} (code: ${err.code})`);
        throw err;
      }
    }

    return { paymentUrl, referenceId: monCashRef };
  }

  async processWebhookPayment(body: any): Promise<void> {
    this.logger.log(`MCConnect webhook body: ${JSON.stringify(body)}`);

    try {
      await this._processWebhookPaymentInner(body);
    } catch (err: any) {
      this.logger.error(
        `MCConnect webhook UNHANDLED ERROR: ${err.message} (code=${err.code ?? 'n/a'})`,
        err.stack,
      );
      throw err;
    }
  }

  private async _processWebhookPaymentInner(body: any): Promise<void> {
    const referenceId: string | undefined = body.referenceId ?? body.reference_id ?? body.reference;

    this.logger.log(`MCConnect webhook: extracted referenceId="${referenceId ?? 'NONE'}" from fields referenceId=${body.referenceId} reference_id=${body.reference_id} reference=${body.reference}`);

    if (!referenceId) {
      this.logger.warn('MCConnect webhook: no referenceId in body — ignoring');
      return;
    }

    const transaction = await this.prisma.transaction.findFirst({
      where: { reference: referenceId },
      include: { receiverWallet: true },
    });

    this.logger.log(`MCConnect webhook: findFirst result for ref=${referenceId}: ${transaction ? `found id=${transaction.id} status=${transaction.status}` : 'NOT FOUND'}`);

    if (!transaction) {
      this.logger.warn(`MCConnect webhook: no transaction found for ref=${referenceId}`);
      return;
    }

    if (transaction.status !== 'PENDING') {
      this.logger.log(`MCConnect webhook: tx ${transaction.id} already ${transaction.status} — skipping`);
      return;
    }

    const amountHTG = Number(transaction.amount);
    const fee = Math.round(amountHTG * FEE_RATE * 100) / 100;
    const netAmount = Math.round((amountHTG - fee) * 100) / 100;
    const userId = transaction.receiverWallet?.userId;

    if (!userId) {
      this.logger.error(`MCConnect webhook: tx ${transaction.id} has no receiverWallet userId`);
      return;
    }

    if (!MASTER_ID) {
      this.logger.error('MCConnect webhook: OZAMAPAY_MASTER_ID env var is not set — aborting');
      throw new Error('OZAMAPAY_MASTER_ID is not configured');
    }

    this.logger.log(
      `MCConnect webhook: crediting tx=${transaction.id} amount=${amountHTG} fee=${fee} net=${netAmount} userId=${userId.substring(0, 8)}... MASTER_ID=${MASTER_ID.substring(0, 8)}...`,
    );

    // Atomic claim: updateMany with status filter is a safe, PgBouncer-compatible
    // double-credit guard (Serializable $transaction callback fails on Neon pooler).
    const claimed = await this.prisma.transaction.updateMany({
      where: { id: transaction.id, status: 'PENDING' },
      data: { status: 'PROCESSING' },
    });

    this.logger.log(`MCConnect webhook: updateMany claim result: count=${claimed.count}`);

    if (claimed.count === 0) {
      this.logger.warn(`MCConnect webhook: tx ${transaction.id} already claimed by another process — skipping`);
      return;
    }

    try {
      await this.prisma.$transaction([
        this.prisma.wallet.update({ where: { userId }, data: { balance: { increment: netAmount } } }),
        this.prisma.wallet.update({ where: { userId: MASTER_ID }, data: { balance: { increment: fee } } }),
        this.prisma.transaction.update({
          where: { id: transaction.id },
          data: { status: 'COMPLETED', fee, netAmount },
        }),
      ]);
    } catch (err: any) {
      this.logger.error(
        `MCConnect webhook: $transaction failed for tx ${transaction.id}: ${err.message} (code=${err.code ?? 'n/a'})`,
      );
      // Revert PROCESSING → PENDING so the next webhook retry can reclaim it
      try {
        await this.prisma.transaction.update({
          where: { id: transaction.id },
          data: { status: 'PENDING' },
        });
        this.logger.log(`MCConnect webhook: reverted tx ${transaction.id} PROCESSING → PENDING for retry`);
      } catch (revertErr: any) {
        this.logger.error(`MCConnect webhook: revert also failed for tx ${transaction.id}: ${revertErr.message}`);
      }
      throw err;
    }

    this.logger.log(`MCConnect webhook: tx ${transaction.id} COMPLETED — credited ${netAmount} HTG to user`);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      try {
        await this.mailService.sendTopupConfirmed(user.email, user.name ?? 'Kliyan', netAmount, 'MonCash');
      } catch {}
    }
  }

  // ── STATUS CHECK ────────────────────────────────────────────────────────────
  // Probes the MonCashConnect pay-status endpoint if it exists.
  // Returns 'COMPLETED' | 'FAILED' | 'PENDING' on a known answer, null when
  // the endpoint is unavailable or the response is unrecognisable.
  async checkPaymentStatus(referenceId: string): Promise<'COMPLETED' | 'FAILED' | 'PENDING' | null> {
    try {
      const res = await fetch(`${BASE_URL}/pay-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.MONCASHCONNECT_SECRET_KEY}`,
        },
        body: JSON.stringify({ referenceId }),
      });

      if (!res.ok) {
        this.logger.warn(`MonCashConnect pay-status: HTTP ${res.status} for ${referenceId} — endpoint may not exist`);
        return null;
      }

      const data = await res.json();
      const raw: string = data?.status ?? data?.payment_status ?? data?.state ?? '';
      const upper = raw.toUpperCase();

      if (['COMPLETED', 'SUCCESSFUL', 'SUCCESS', 'PAID'].includes(upper)) return 'COMPLETED';
      if (['FAILED', 'CANCELLED', 'EXPIRED', 'REJECTED'].includes(upper)) return 'FAILED';
      if (upper === 'PENDING') return 'PENDING';

      this.logger.warn(`MonCashConnect pay-status: unrecognised status "${raw}" for ${referenceId}`);
      return null;
    } catch (err: any) {
      this.logger.warn(`MonCashConnect pay-status check error for ${referenceId}: ${err.message}`);
      return null;
    }
  }

  // ── EXPIRY CRON ─────────────────────────────────────────────────────────────
  // Runs every 5 minutes. For each PENDING MonCash transaction older than
  // STALE_MINUTES it first tries the pay-status endpoint:
  //   • status COMPLETED  → credit the wallet via processWebhookPayment (missed-webhook recovery)
  //   • status FAILED / null (endpoint unavailable) → mark CANCELLED
  @Cron('*/5 * * * *')
  async expireStalePayments(): Promise<void> {
    const cutoff = new Date(Date.now() - STALE_MINUTES * 60 * 1000);

    const stale = await this.prisma.transaction.findMany({
      where: {
        type: 'TOPUP',
        status: 'PENDING',
        method: 'MonCash',
        createdAt: { lte: cutoff },
      },
      select: { id: true, reference: true },
    });

    if (stale.length === 0) return;

    this.logger.log(`MonCashConnect expiry: processing ${stale.length} stale PENDING transaction(s)`);

    for (const tx of stale) {
      try {
        const paymentStatus = await this.checkPaymentStatus(tx.reference);

        if (paymentStatus === 'COMPLETED') {
          // Webhook was never received — recover by crediting the wallet now.
          // processWebhookPayment re-checks status inside a Serializable transaction
          // so it is safe to call even if the webhook arrives concurrently.
          this.logger.warn(
            `MonCashConnect: recovered missed webhook for reference ${tx.reference} — crediting wallet`,
          );
          await this.processWebhookPayment({ referenceId: tx.reference });
        } else {
          // Either confirmed not paid, or status endpoint is unavailable — cancel.
          const updated = await this.prisma.transaction.updateMany({
            where: { id: tx.id, status: 'PENDING' },
            data: { status: 'CANCELLED' },
          });
          if (updated.count > 0) {
            this.logger.log(
              `MonCashConnect: cancelled stale transaction ${tx.id} ` +
              `(pay-status returned: ${paymentStatus ?? 'unavailable'})`,
            );
          }
        }
      } catch (err: any) {
        this.logger.error(`MonCashConnect expiry: error on transaction ${tx.id}: ${err.message}`);
      }
    }
  }
}
