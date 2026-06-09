import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

const BASE_URL = 'https://hvlmeoqyxaguzcujpmit.supabase.co/functions/v1';
const FEE_RATE = 0.06;
const MASTER_ID = process.env.OZAMAPAY_MASTER_ID as string;

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
        throw new Error(`MonCashConnect pay-create failed: ${JSON.stringify(data)}`);
      }
    } catch (err: any) {
      console.error('MoncashConnect error:', (err as Error).message);
      throw err;
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
        console.error('MoncashConnect createPaymentRequest DB error:', err.message, err.code);
        throw err;
      }
    }

    return { paymentUrl, referenceId: monCashRef };
  }

  verifyWebhook(payload: string, signature: string): boolean {
    const secret = process.env.MONCASHCONNECT_WEBHOOK_SECRET as string;
    const expected = createHmac('sha256', secret).update(payload).digest('hex');
    try {
      return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  async processWebhookPayment(body: any): Promise<void> {
    const referenceId: string | undefined = body.referenceId ?? body.reference_id ?? body.reference;

    if (!referenceId) return;

    const transaction = await this.prisma.transaction.findFirst({
      where: { reference: referenceId },
      include: { receiverWallet: true },
    });

    if (!transaction) return;

    if (transaction.status !== 'PENDING') return;

    const amountHTG = Number(transaction.amount);
    const fee = Math.round(amountHTG * FEE_RATE * 100) / 100;
    const netAmount = Math.round((amountHTG - fee) * 100) / 100;
    const userId = transaction.receiverWallet?.userId;
    if (!userId) return;

    await this.prisma.$transaction(async (tx) => {
      // Re-read status inside the transaction to prevent concurrent double-credit
      const current = await tx.transaction.findUnique({ where: { id: transaction.id } });
      if (!current || current.status !== 'PENDING') return;

      await tx.wallet.update({ where: { userId }, data: { balance: { increment: netAmount } } });
      await tx.wallet.update({ where: { userId: MASTER_ID }, data: { balance: { increment: fee } } });
      await tx.transaction.update({
        where: { id: transaction.id },
        data: { status: 'COMPLETED', fee, netAmount },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      try {
        await this.mailService.sendTopupConfirmed(user.email, user.name ?? 'Kliyan', netAmount, 'MonCash');
      } catch {}
    }
  }
}
