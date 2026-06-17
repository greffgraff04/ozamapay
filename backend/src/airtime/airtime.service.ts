import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReloadlyAuthService } from '../reloadly/reloadly-auth.service';

const AIRTIME_BASE = 'https://topups.reloadly.com';
const AIRTIME_AUDIENCE = 'https://topups.reloadly.com';
const MARGIN = 0.05;
const MASTER_ID = process.env.OZAMAPAY_MASTER_ID as string;

@Injectable()
export class AirtimeService {
  private readonly logger = new Logger(AirtimeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reloadlyAuth: ReloadlyAuthService,
  ) {}

  // ─── HTTP helpers ─────────────────────────────────────────────────────────

  private async get(path: string) {
    const token = await this.reloadlyAuth.getToken(AIRTIME_AUDIENCE);
    const res = await fetch(`${AIRTIME_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/com.reloadly.topups-v1+json',
      },
    });
    if (!res.ok) throw new Error(`Reloadly Airtime GET ${path}: ${await res.text()}`);
    return res.json();
  }

  private async post(path: string, body: any) {
    const token = await this.reloadlyAuth.getToken(AIRTIME_AUDIENCE);
    const res = await fetch(`${AIRTIME_BASE}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/com.reloadly.topups-v1+json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Reloadly Airtime POST ${path}: ${await res.text()}`);
    return res.json();
  }

  // ─── Operators ────────────────────────────────────────────────────────────

  async getOperators(countryCode = 'HT') {
    return this.get(`/operators/countries/${countryCode}`);
  }

  // ─── Topup ────────────────────────────────────────────────────────────────

  async sendAirtime(userId: string, operatorId: number, amount: number, phoneNumber: string) {
    // amount is in HTG (useLocalAmount: true)
    const htgCost = Math.round(amount * (1 + MARGIN) * 100) / 100;
    const marginHTG = Math.round(amount * MARGIN * 100) / 100;

    let operatorName = `Operator #${operatorId}`;
    try {
      const op = await this.get(`/operators/${operatorId}`);
      operatorName = op.name ?? operatorName;
    } catch {}

    // 1 — Debit wallet + create PENDING order
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
      const order = await tx.airtimeOrder.create({
        data: { userId, operatorId, operatorName, amount, htgPaid: htgCost, phoneNumber, status: 'PENDING' },
      });
      return { orderId: order.id, newBalance: updated.balance };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    // 2 — Call Reloadly outside the DB transaction
    let transactionId: string | null = null;

    try {
      const result = await this.post('/topups', {
        operatorId,
        amount,
        useLocalAmount: true,
        customIdentifier: orderId,
        recipientPhone: { countryCode: 'HT', number: phoneNumber },
        senderPhone: { countryCode: 'US', number: '13055550000' },
      });
      transactionId = result.transactionId?.toString() ?? null;
    } catch (err: any) {
      this.logger.error(`Airtime topup failed for orderId ${orderId}: ${err.message}`);
      await this.prisma.$transaction(async (tx) => {
        await tx.wallet.update({ where: { userId }, data: { balance: { increment: htgCost } } });
        await tx.wallet.update({ where: { userId: MASTER_ID }, data: { balance: { decrement: marginHTG } } });
        await tx.airtimeOrder.update({ where: { id: orderId }, data: { status: 'FAILED' } });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      throw new BadRequestException('Nou rankontre yon pwoblèm teknik. Tanpri eseye ankò pita oswa kontakte sipò OZAMAPAY.');
    }

    await this.prisma.airtimeOrder.update({
      where: { id: orderId },
      data: { status: 'COMPLETED', transactionId: transactionId ?? undefined },
    });

    this.logger.log(`Airtime sent ${amount} HTG to ${phoneNumber} via operator ${operatorId}`);
    return { orderId, operatorName, amount, htgPaid: htgCost, phoneNumber, transactionId, status: 'COMPLETED', newBalance };
  }

  // ─── History ──────────────────────────────────────────────────────────────

  async getUserOrders(userId: string) {
    return this.prisma.airtimeOrder.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}
