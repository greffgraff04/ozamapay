import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { StrowalletService } from './strowallet.service';

const CARD_CREATION_FEE_USD = 2.5;
const CARD_TERMINATION_PENALTY_USD = 5;
const MIN_NEW_CARD_BALANCE_USD = 3;
const TOTAL_FEES_USD = CARD_CREATION_FEE_USD + CARD_TERMINATION_PENALTY_USD; // 7.5
const TOTAL_NEEDED_USD = TOTAL_FEES_USD + MIN_NEW_CARD_BALANCE_USD; // 10.5

type UserWithWallet = { email: string; name: string | null; wallet: { id: string; balance: any } | null };

@Injectable()
export class CardTerminationService {
  private readonly logger = new Logger(CardTerminationService.name);
  private isRetryingPending = false;

  constructor(
    private prisma: PrismaService,
    private strowalletService: StrowalletService,
    private mailService: MailService,
  ) {}

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }

  // ── entry point: called by the webhook controller for
  //    virtualcard.transaction.declined.terminated ──────────────────────────
  async handleTerminationEvent(payload: any): Promise<void> {
    const eventId = payload?.id;
    if (!eventId) {
      this.logger.error('[CardTermination] Payload san id — skip idempotence, pa trete');
      return;
    }

    // Claim the event first — if it already exists, this is a duplicate delivery.
    try {
      await this.prisma.strowalletWebhookEvent.create({
        data: {
          eventId,
          event: payload?.event ?? 'virtualcard.transaction.declined.terminated',
          rawPayload: payload,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        this.logger.log(`[CardTermination] eventId=${eventId} deja trete — ignore`);
        return;
      }
      throw err;
    }

    const cardId = payload?.cardId;
    if (!cardId) {
      this.logger.error(`[CardTermination] eventId=${eventId} — payload san cardId`);
      return;
    }

    const amountAvailableUsd = Number(payload?.balanceBeforeTermination ?? 0);

    const card = await this.prisma.virtualCard.findUnique({
      where: { cardId },
      include: { user: { include: { wallet: true } } },
    });
    if (!card) {
      this.logger.warn(`[CardTermination] Kat enkoni cardId=${cardId}`);
      return;
    }

    await this.prisma.virtualCard.update({
      where: { cardId },
      data: { status: 'TERMINATED', balanceAtTermination: amountAvailableUsd, terminatedAt: new Date() },
    });

    if (amountAvailableUsd >= TOTAL_NEEDED_USD) {
      const fundAmount = this.round(amountAvailableUsd - TOTAL_FEES_USD);
      await this.finalizeReplacement(card.userId, cardId, fundAmount, 0, card.user);
      return;
    }

    const shortfallUsd = this.round(TOTAL_NEEDED_USD - amountAvailableUsd);
    const rate = await this.strowalletService.getExchangeRate();
    const shortfallHtg = Math.ceil(shortfallUsd * rate);
    const walletBalanceHtg = Number(card.user.wallet?.balance ?? 0);

    if (card.user.wallet && walletBalanceHtg >= shortfallHtg) {
      await this.finalizeReplacement(card.userId, cardId, MIN_NEW_CARD_BALANCE_USD, shortfallHtg, card.user);
      return;
    }

    const missingHtg = Math.ceil(shortfallHtg - walletBalanceHtg);
    await this.prisma.virtualCard.update({
      where: { cardId },
      data: { status: 'PENDING_RECHARGE', pendingShortfallHtg: shortfallHtg },
    });
    this.logger.warn(`[CardTermination] cardId=${cardId} PENDING_RECHARGE — manke ${missingHtg} HTG`);
    await this.mailService.sendCardPendingRecharge(card.user.email, card.user.name ?? 'Kliyan', shortfallHtg, missingHtg).catch(() => {});
    await this.pushNotification(
      card.userId,
      'Rechaje wallet ou pou nouvo kat',
      `Wallet ou manke ${missingHtg} HTG pou n ka kreye yon nouvo kat pou ou.`,
      'WARNING',
    );
  }

  // ── shared finish step: optionally debit the shortfall from the HTG wallet,
  //    create+fund the replacement card at StroWallet, flip the old row to
  //    REPLACED, and notify the customer ──────────────────────────────────
  private async finalizeReplacement(
    userId: string,
    oldCardId: string,
    fundAmountUsd: number,
    feeDeductedHtg: number,
    user: UserWithWallet,
  ): Promise<void> {
    if (feeDeductedHtg > 0) {
      if (!user.wallet) throw new Error(`Pa gen wallet pou userId=${userId}, pa ka dediwi frè`);
      await this.prisma.$transaction(async (tx) => {
        await tx.wallet.update({
          where: { userId },
          data: { balance: { decrement: feeDeductedHtg } },
        });
        await tx.transaction.create({
          data: {
            senderWalletId: user.wallet!.id,
            type: 'CARD',
            amount: feeDeductedHtg,
            netAmount: feeDeductedHtg,
            fee: 0,
            status: 'COMPLETED',
            description: `Frè ranplasman kat vityèl (terminasyon) — ${feeDeductedHtg} HTG`,
            reference: `CARD-REPL-FEE-${oldCardId}-${Date.now()}`,
          },
        });
      });
    }

    const newCard = await this.strowalletService.createReplacementCard(userId, fundAmountUsd);
    await this.prisma.virtualCard.update({
      where: { cardId: oldCardId },
      data: { status: 'REPLACED', replacedByCardId: newCard.id },
    });

    this.logger.log(
      `[CardTermination] cardId=${oldCardId} ranplase — nouvo balans $${fundAmountUsd}` +
        (feeDeductedHtg > 0 ? `, ${feeDeductedHtg} HTG dediwi nan wallet` : ''),
    );

    await this.mailService
      .sendCardReplaced(user.email, user.name ?? 'Kliyan', fundAmountUsd, feeDeductedHtg || undefined)
      .catch(() => {});

    const message = feeDeductedHtg > 0
      ? `Kat ranplase, ${feeDeductedHtg} HTG dediwi nan wallet ou pou frè yo`
      : `Kat ou ranplase otomatikman, nouvo balans: $${fundAmountUsd}`;
    await this.pushNotification(userId, 'Kat ou ranplase', message, 'SUCCESS');
  }

  private async pushNotification(
    userId: string,
    title: string,
    message: string,
    type: 'SUCCESS' | 'WARNING',
  ): Promise<void> {
    await this.prisma.notification.create({ data: { userId, title, message, type } }).catch(() => {});
  }

  // ── retry: every 2 minutes, re-check cards stuck in PENDING_RECHARGE ───────
  @Cron('0 */2 * * * *')
  async retryPendingRecharges(): Promise<void> {
    if (this.isRetryingPending) return;
    this.isRetryingPending = true;

    try {
      const pendingCards = await this.prisma.virtualCard.findMany({
        where: { status: 'PENDING_RECHARGE' },
        include: { user: { include: { wallet: true } } },
      });

      for (const card of pendingCards) {
        const shortfallHtg = Number(card.pendingShortfallHtg ?? 0);
        const walletBalanceHtg = Number(card.user.wallet?.balance ?? 0);
        if (!card.user.wallet || walletBalanceHtg < shortfallHtg) continue;

        // Atomic claim: only one retry tick may move this card out of PENDING_RECHARGE.
        const claimed = await this.prisma.virtualCard.updateMany({
          where: { cardId: card.cardId, status: 'PENDING_RECHARGE' },
          data: { status: 'TERMINATED' },
        });
        if (claimed.count === 0) continue;

        try {
          await this.finalizeReplacement(card.userId, card.cardId, MIN_NEW_CARD_BALANCE_USD, shortfallHtg, card.user);
        } catch (err: any) {
          this.logger.error(`[CardTermination] Retry echwe pou cardId=${card.cardId}: ${err.message}`);
          // Put it back so the next tick retries.
          await this.prisma.virtualCard.update({
            where: { cardId: card.cardId },
            data: { status: 'PENDING_RECHARGE' },
          }).catch(() => {});
        }
      }
    } catch (err: any) {
      this.logger.error(`[CardTermination] retryPendingRecharges echwe: ${err.message}`);
    } finally {
      this.isRetryingPending = false;
    }
  }
}
