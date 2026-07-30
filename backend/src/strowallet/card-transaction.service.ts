import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CardTransactionService {
  private readonly logger = new Logger(CardTransactionService.name);

  constructor(private prisma: PrismaService) {}

  async recordAuthorization(payload: any): Promise<void> {
    if (!(await this.claimEvent(payload))) return;

    const cardId = payload?.cardId;
    const reference = payload?.reference;
    if (!cardId || !reference) {
      this.logger.error('[CardTransaction][auth] Payload san cardId oswa reference — skip');
      return;
    }

    const card = await this.prisma.virtualCard.findUnique({ where: { cardId } });
    if (!card) {
      this.logger.warn(`[CardTransaction][auth] Kat enkoni cardId=${cardId}`);
      return;
    }

    await this.upsert(card.userId, cardId, reference, 'AUTHORIZATION', payload);

    await this.pushNotification(
      card.userId,
      'Tranzaksyon kat',
      `-$${payload.amount} — ${payload.merchant ?? payload.narrative ?? 'Peman kat Visa'}`,
    );
  }

  async recordTopupComplete(payload: any): Promise<void> {
    if (!(await this.claimEvent(payload))) return;

    const cardId = payload?.cardId;
    const reference = payload?.reference;
    if (!cardId || !reference) {
      this.logger.error('[CardTransaction][topup] Payload san cardId oswa reference — skip');
      return;
    }

    const card = await this.prisma.virtualCard.findUnique({ where: { cardId } });
    if (!card) {
      this.logger.warn(`[CardTransaction][topup] Kat enkoni cardId=${cardId}`);
      return;
    }

    await this.upsert(card.userId, cardId, reference, 'TOPUP', payload);

    await this.pushNotification(card.userId, 'Kat rechaje', `+$${payload.amount} ajoute sou kat ou`);
  }

  private async upsert(
    userId: string,
    cardId: string,
    reference: string,
    type: 'AUTHORIZATION' | 'TOPUP',
    payload: any,
  ): Promise<void> {
    const data = {
      userId,
      cardId,
      reference,
      type,
      amount: Number(payload.amount ?? 0),
      currency: payload.currency ?? 'USD',
      status: String(payload.status ?? ''),
      merchant: payload.merchant ?? null,
      narrative: payload.narrative ?? null,
      mcc: payload.mcc ?? null,
      country: payload.country ?? null,
      occurredAt: payload.date ? new Date(payload.date) : new Date(),
    };

    await this.prisma.cardTransaction.upsert({
      where: { reference },
      create: data,
      update: data,
    });
  }

  // Same claim-first idempotence pattern as CardTerminationService.handleTerminationEvent.
  private async claimEvent(payload: any): Promise<boolean> {
    const eventId = payload?.id;
    if (!eventId) {
      this.logger.error('[CardTransaction] Payload san id — skip idempotence, pa trete');
      return false;
    }

    try {
      await this.prisma.strowalletWebhookEvent.create({
        data: { eventId, event: payload?.event ?? 'unknown', rawPayload: payload },
      });
      return true;
    } catch (err: any) {
      if (err?.code === 'P2002') {
        this.logger.log(`[CardTransaction] eventId=${eventId} deja trete — ignore`);
        return false;
      }
      throw err;
    }
  }

  private async pushNotification(userId: string, title: string, message: string): Promise<void> {
    await this.prisma.notification.create({ data: { userId, title, message, type: 'INFO' } }).catch(() => {});
  }
}
