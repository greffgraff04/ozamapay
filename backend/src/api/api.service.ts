import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { createHmac, randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { IsMoneyAmount } from '../common/validation/money-amount.decorator';

const BUSINESS_PAYMENT_FEE: Record<string, number> = {
  STARTER: 0.025,
  PRO: 0.020,
  ENTERPRISE: 0.015,
};

export type ApiPermission = 'READ' | 'WRITE' | 'WEBHOOK';

// ApiPayment.currency pa janm konvèti — platfòm lan ap opere sèlman an HTG
// (`testWalletBalance`/`Wallet.balance` toujou HTG, pa gen okenn lojik
// konvèsyon pou peman API). Aksepte yon lòt devise ta jis estoke yon etikèt
// fo san okenn konvèsyon reyèl — se risk #10 nan odit la.
export const API_PAYMENT_CURRENCIES = ['HTG'];
// Pa gen plafon biznis egziste pou peman API — menm echèl ak BUSINESS_PAYMENT_MAX_HTG.
export const API_PAYMENT_MAX_HTG = 500_000;

export class InitiatePaymentDto {
  @IsMoneyAmount(API_PAYMENT_MAX_HTG)
  amount: number;

  @IsOptional()
  @IsIn(API_PAYMENT_CURRENCIES)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

// Sèl evenman API ki janm deklanche reyèlman — wè ApiService.fireWebhooks
// pi ba, menm rezon ak BUSINESS_WEBHOOK_EVENTS nan business.service.ts.
export const API_WEBHOOK_EVENTS = ['payment.received'];

export class CreateWebhookDto {
  @IsUrl({ protocols: ['https'], require_protocol: true })
  url: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsIn(API_WEBHOOK_EVENTS, { each: true })
  events: string[];
}

@Injectable()
export class ApiService {
  constructor(private prisma: PrismaService) {}

  private round(n: number) {
    return Math.round(n * 100) / 100;
  }

  assertPermission(apiKey: any, perm: ApiPermission) {
    if (!apiKey.permissions.includes(perm)) {
      throw new ForbiddenException(`API Key sa a pa gen pèmisyon ${perm}`);
    }
  }

  // ── 1. Initiate payment ──────────────────────────────────────────────────

  async initiatePayment(business: any, apiKey: any, dto: InitiatePaymentDto) {
    this.assertPermission(apiKey, 'WRITE');

    const amount = Number(dto.amount);
    if (!amount || amount <= 0) throw new BadRequestException('Montan envalid');

    const feeRate = BUSINESS_PAYMENT_FEE[business.tier] ?? BUSINESS_PAYMENT_FEE.STARTER;
    const fee = this.round(amount * feeRate);
    const reference = dto.reference || `APIPAY-${uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase()}`;

    if (apiKey.mode === 'TEST') {
      // Test payments settle instantly against the business's fake test
      // balance — never touches BusinessWallet or fires real webhooks flow.
      const tx = await this.prisma.$transaction(async (tx) => {
        await tx.business.update({
          where: { id: business.id },
          data: { testWalletBalance: { increment: this.round(amount - fee) } },
        });
        return tx.testTransaction.create({
          data: {
            businessId: business.id,
            apiKeyId: apiKey.id,
            amount,
            fee,
            reference,
            description: dto.description,
            status: 'COMPLETED',
          },
        });
      });

      return {
        paymentId: tx.id,
        paymentUrl: null,
        mode: 'TEST',
        status: tx.status,
        amount,
        fee,
        reference,
      };
    }

    const payment = await this.prisma.apiPayment.create({
      data: {
        businessId: business.id,
        apiKeyId: apiKey.id,
        amount,
        currency: dto.currency || 'HTG',
        fee,
        reference,
        description: dto.description,
        status: 'PENDING',
      },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'https://ozamapay.com';
    return {
      paymentId: payment.id,
      paymentUrl: `${frontendUrl}/pay?business=${business.id}&apiPayment=${payment.id}`,
      mode: 'LIVE',
      status: payment.status,
      amount,
      fee,
      reference,
    };
  }

  // ── 2. Get payment status ────────────────────────────────────────────────

  async getPayment(business: any, apiKey: any, paymentId: string) {
    this.assertPermission(apiKey, 'READ');

    const payment = apiKey.mode === 'TEST'
      ? await this.prisma.testTransaction.findUnique({ where: { id: paymentId } })
      : await this.prisma.apiPayment.findUnique({ where: { id: paymentId } });

    if (!payment || payment.businessId !== business.id) {
      throw new NotFoundException('Peman pa jwenn');
    }

    return {
      paymentId: payment.id,
      status: payment.status,
      amount: payment.amount,
      fee: payment.fee,
      paidAt: (payment as any).paidAt ?? (payment.status === 'COMPLETED' ? payment.createdAt : null),
    };
  }

  // ── 3. Transaction history ──────────────────────────────────────────────

  async getTransactions(
    business: any,
    apiKey: any,
    query: { limit?: string; offset?: string; status?: string; from?: string; to?: string },
  ) {
    this.assertPermission(apiKey, 'READ');

    const limit = Math.min(Number(query.limit) || 20, 100);
    const offset = Math.max(Number(query.offset) || 0, 0);

    const where: any = { businessId: business.id };
    if (query.status) where.status = query.status;
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }

    if (apiKey.mode === 'TEST') {
      const [data, total] = await this.prisma.$transaction([
        this.prisma.testTransaction.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit, skip: offset }),
        this.prisma.testTransaction.count({ where }),
      ]);
      return { data, total, limit, offset, mode: 'TEST' };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.apiPayment.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit, skip: offset }),
      this.prisma.apiPayment.count({ where }),
    ]);
    return { data, total, limit, offset, mode: 'LIVE' };
  }

  // ── 4. Balance ────────────────────────────────────────────────────────────

  async getBalance(business: any, apiKey: any) {
    this.assertPermission(apiKey, 'READ');

    if (apiKey.mode === 'TEST') {
      return { balance: business.testWalletBalance, currency: 'HTG', mode: 'TEST' };
    }
    const wallet = await this.prisma.businessWallet.findUnique({ where: { businessId: business.id } });
    return { balance: wallet?.balance ?? 0, currency: wallet?.currency ?? 'HTG', mode: 'LIVE' };
  }

  // ── 5/6/7. Webhooks ──────────────────────────────────────────────────────

  async createWebhook(business: any, apiKey: any, dto: CreateWebhookDto) {
    this.assertPermission(apiKey, 'WEBHOOK');

    if (!dto.url || !/^https:\/\//.test(dto.url)) {
      throw new BadRequestException('URL webhook dwe kòmanse ak https://');
    }
    const secret = `whsec_${randomBytes(24).toString('hex')}`;
    const webhook = await this.prisma.webhookEndpoint.create({
      data: { businessId: business.id, url: dto.url, events: dto.events || [], secret },
    });
    return webhook;
  }

  async listWebhooks(business: any, apiKey: any) {
    this.assertPermission(apiKey, 'WEBHOOK');
    return this.prisma.webhookEndpoint.findMany({ where: { businessId: business.id }, orderBy: { createdAt: 'desc' } });
  }

  async removeWebhook(business: any, apiKey: any, webhookId: string) {
    this.assertPermission(apiKey, 'WEBHOOK');
    const wh = await this.prisma.webhookEndpoint.findUnique({ where: { id: webhookId } });
    if (!wh || wh.businessId !== business.id) throw new NotFoundException('Webhook pa jwenn');
    await this.prisma.webhookEndpoint.delete({ where: { id: webhookId } });
    return { success: true };
  }

  // Fires every active webhook subscribed to `event` for a business.
  // Fire-and-forget on purpose — a slow/unreachable customer endpoint must
  // never block or fail the underlying OZAMAPAY transaction.
  async fireWebhooks(businessId: string, event: string, payload: Record<string, any>) {
    const webhooks = await this.prisma.webhookEndpoint.findMany({
      where: { businessId, isActive: true, events: { has: event } },
    });

    for (const wh of webhooks) {
      const body = JSON.stringify({ event, ...payload });
      const signature = createHmac('sha256', wh.secret).update(body).digest('hex');
      fetch(wh.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Ozamapay-Signature': signature },
        body,
      }).catch(() => {});
    }
  }
}
