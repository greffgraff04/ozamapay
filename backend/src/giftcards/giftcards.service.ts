import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const RELOADLY_AUTH_URL = 'https://auth.reloadly.com/oauth/token';
const RELOADLY_BASE = 'https://giftcards.reloadly.com';
const MARGIN = 0.05;
const MASTER_ID = process.env.OZAMAPAY_MASTER_ID as string;

@Injectable()
export class GiftCardsService {
  private readonly logger = new Logger(GiftCardsService.name);
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(private readonly prisma: PrismaService) {}

  // ─── Auth ────────────────────────────────────────────────────────────────

  private async getToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }
    const res = await fetch(RELOADLY_AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.RELOADLY_CLIENT_ID,
        client_secret: process.env.RELOADLY_CLIENT_SECRET,
        grant_type: 'client_credentials',
        audience: 'https://giftcards.reloadly.com',
      }),
    });
    if (!res.ok) throw new Error(`Reloadly auth failed: ${await res.text()}`);
    const data = await res.json();
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
    return this.accessToken!;
  }

  // ─── HTTP helpers ─────────────────────────────────────────────────────────

  private async reloadlyGet(path: string) {
    const token = await this.getToken();
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
    const token = await this.getToken();
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
      // Refund
      await this.prisma.$transaction(async (tx) => {
        await tx.wallet.update({ where: { userId }, data: { balance: { increment: htgCost } } });
        await tx.wallet.update({ where: { userId: MASTER_ID }, data: { balance: { decrement: marginHTG } } });
        await tx.giftCardOrder.update({ where: { id: orderId }, data: { status: 'FAILED' } });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      throw new BadRequestException(`Reloadly order echwe: ${err.message}`);
    }

    // 3 — Persist result
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
}
