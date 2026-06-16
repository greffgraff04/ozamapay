import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReloadlyAuthService } from '../reloadly/reloadly-auth.service';

const RELOADLY_BASE = 'https://giftcards.reloadly.com';
const GIFTCARDS_AUDIENCE = 'https://giftcards.reloadly.com';
const MARGIN = 0.05;
const MASTER_ID = process.env.OZAMAPAY_MASTER_ID as string;

@Injectable()
export class GiftCardsService {
  private readonly logger = new Logger(GiftCardsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reloadlyAuth: ReloadlyAuthService,
  ) {}

  // ─── HTTP helpers ─────────────────────────────────────────────────────────

  private async reloadlyGet(path: string) {
    const token = await this.reloadlyAuth.getToken(GIFTCARDS_AUDIENCE);
    const res = await fetch(`${RELOADLY_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/com.reloadly.giftcards-v1+json',
      },
    });
    if (!res.ok) throw new Error(`Reloadly GET ${path}: ${await res.text()}`);
    return res.json();
  }

  private async reloadlyPost(path: string, body: any) {
    const token = await this.reloadlyAuth.getToken(GIFTCARDS_AUDIENCE);
    const res = await fetch(`${RELOADLY_BASE}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/com.reloadly.giftcards-v1+json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Reloadly POST ${path}: ${await res.text()}`);
    return res.json();
  }

  // ─── Products ─────────────────────────────────────────────────────────────

  async getProducts(countryCode = 'US') {
    return this.reloadlyGet(`/products?countryCode=${countryCode}&size=200`);
  }

  async getProductById(productId: number) {
    return this.reloadlyGet(`/products/${productId}`);
  }

  // ─── Order ────────────────────────────────────────────────────────────────

  async orderGiftCard(userId: string, productId: number, unitPrice: number) {
    const rateEntry = await this.prisma.rate.findUnique({ where: { key: 'USD_HTG' } });
    const exchangeRate = Number(rateEntry?.value ?? 140);
    const htgCost = Math.round(unitPrice * exchangeRate * (1 + MARGIN) * 100) / 100;
    const marginHTG = Math.round(unitPrice * exchangeRate * MARGIN * 100) / 100;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('Itilizatè pa jwenn');

    let productName = `Gift Card #${productId}`;
    try {
      const p = await this.getProductById(productId);
      productName = p.productName ?? productName;
    } catch {}

    // 1 — Debit wallet + create PENDING order (serializable)
    const { orderId, newBalance } = await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) throw new BadRequestException('Wallet pa jwenn');
      if (Number(wallet.balance) < htgCost) {
        throw new BadRequestException(`Balans ensifizan — bezwen ${htgCost} HTG`);
      }

      const updated = await tx.wallet.update({
        where: { userId },
        data: { balance: { decrement: htgCost } },
      });
      await tx.wallet.update({
        where: { userId: MASTER_ID },
        data: { balance: { increment: marginHTG } },
      });
      const order = await tx.giftCardOrder.create({
        data: { userId, productId, productName, unitPrice, htgPaid: htgCost, status: 'PENDING' },
      });
      return { orderId: order.id, newBalance: updated.balance };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    // 2 — Call Reloadly outside the DB transaction
    let redeemCode: string | null = null;
    let finalStatus = 'PROCESSING';

    try {
      const result = await this.reloadlyPost('/orders', {
        productId,
        countryCode: 'US',
        quantity: 1,
        unitPrice,
        customIdentifier: orderId,
        senderName: 'OZAMAPAY',
        recipientEmail: user.email,
      });

      if (result.transactionId) {
        const cards = await this.reloadlyGet(`/orders/${result.transactionId}/cards`);
        redeemCode = cards?.[0]?.cardNumber ?? cards?.[0]?.pinCode ?? null;
      }
      finalStatus = redeemCode ? 'COMPLETED' : 'PROCESSING';
    } catch (err: any) {
      this.logger.error(`Reloadly order failed for orderId ${orderId}: ${err.message}`);
      await this.prisma.$transaction(async (tx) => {
        await tx.wallet.update({ where: { userId }, data: { balance: { increment: htgCost } } });
        await tx.wallet.update({ where: { userId: MASTER_ID }, data: { balance: { decrement: marginHTG } } });
        await tx.giftCardOrder.update({ where: { id: orderId }, data: { status: 'FAILED' } });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      throw new BadRequestException(`Reloadly order echwe: ${err.message}`);
    }

    await this.prisma.giftCardOrder.update({
      where: { id: orderId },
      data: { redeemCode: redeemCode ?? undefined, status: finalStatus },
    });

    return { orderId, productName, unitPrice, htgPaid: htgCost, redeemCode, status: finalStatus, newBalance };
  }

  // ─── History ──────────────────────────────────────────────────────────────

  async getOrderReloadly(transactionId: string) {
    return this.reloadlyGet(`/orders/${transactionId}/cards`);
  }

  async getUserOrders(userId: string) {
    return this.prisma.giftCardOrder.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  // ─── Webhook ──────────────────────────────────────────────────────────────

  verifyWebhookSignature(rawBody: string, signature: string, timestamp: string): boolean {
    const secret = process.env.RELOADLY_WEBHOOK_SECRET;
    if (!secret || !signature || !timestamp) return false;
    const dataToSign = rawBody + ':' + timestamp;
    const expected = createHmac('sha256', secret).update(dataToSign).digest('hex');
    try {
      return timingSafeEqual(Buffer.from(expected), Buffer.from(signature.trim()));
    } catch {
      return false;
    }
  }

  async processWebhook(body: any): Promise<void> {
    const { event, status, transaction } = body ?? {};

    if (event !== 'giftcard_transaction.status') return;

    const customId: string | undefined = transaction?.customIdentifier;
    const reloadlyTxId: number | undefined = transaction?.id;

    if (!customId) {
      this.logger.warn('Reloadly webhook: missing customIdentifier');
      return;
    }

    const order = await this.prisma.giftCardOrder.findUnique({ where: { id: customId } });
    if (!order) {
      this.logger.warn(`Reloadly webhook: GiftCardOrder not found for id=${customId}`);
      return;
    }

    if (order.status === 'COMPLETED' || order.status === 'FAILED') return;

    if (status === 'SUCCESSFUL') {
      let redeemCode: string | null = null;
      if (reloadlyTxId) {
        try {
          const cards = await this.reloadlyGet(`/orders/${reloadlyTxId}/cards`);
          redeemCode = cards?.[0]?.cardNumber ?? cards?.[0]?.pinCode ?? null;
        } catch (err: any) {
          this.logger.warn(`Could not fetch redeem code for tx ${reloadlyTxId}: ${err.message}`);
        }
      }
      await this.prisma.giftCardOrder.update({
        where: { id: order.id },
        data: { status: 'COMPLETED', redeemCode: redeemCode ?? undefined },
      });
      this.logger.log(`GiftCardOrder ${order.id} → COMPLETED`);
    } else if (status === 'FAILED') {
      const htgPaid = Number(order.htgPaid);
      const marginHTG = Math.round((htgPaid * MARGIN) / (1 + MARGIN) * 100) / 100;

      await this.prisma.$transaction(async (tx) => {
        const current = await tx.giftCardOrder.findUnique({ where: { id: order.id } });
        if (!current || current.status === 'COMPLETED' || current.status === 'FAILED') return;

        await tx.wallet.update({
          where: { userId: order.userId },
          data: { balance: { increment: htgPaid } },
        });
        await tx.wallet.update({
          where: { userId: MASTER_ID },
          data: { balance: { decrement: marginHTG } },
        });
        await tx.giftCardOrder.update({
          where: { id: order.id },
          data: { status: 'FAILED' },
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

      this.logger.log(`GiftCardOrder ${order.id} → FAILED, refunded ${htgPaid} HTG to user`);
    }
  }
}
