import { Controller, Post, Body, HttpCode, HttpStatus, Logger, Req, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CardTerminationService } from './card-termination.service';
import { CardTransactionService } from './card-transaction.service';
import { CardOtpService } from './card-otp.service';
import { MailService } from '../mail/mail.service';

@Controller('v1/webhooks/strowallet')
export class StrowalletWebhookController {
  private readonly logger = new Logger(StrowalletWebhookController.name);

  constructor(
    private prisma: PrismaService,
    private cardTerminationService: CardTerminationService,
    private cardTransactionService: CardTransactionService,
    private cardOtpService: CardOtpService,
    private mailService: MailService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleStrowalletWebhook(@Body() payload: any, @Req() req: any) {
    const secret = req.query.secret;
    if (!secret || secret !== process.env.STROWALLET_WEBHOOK_SECRET) {
      throw new UnauthorizedException('Invalid webhook secret');
    }

    const event = payload?.event as string | undefined;
    // 'otp.code' gen yon 'authorizationCode' sansib nan payload la — PA janm
    // dump payload konplè a pou evènman sa a, menm nan lòg.
    if (event === 'otp.code') {
      this.logger.log(`[Strowallet] event=otp.code | cardId=${payload?.cardId} last4=${payload?.last4} reference=${payload?.reference}`);
    } else {
      this.logger.log(`[Strowallet] event=${event} | ${JSON.stringify(payload)}`);
    }

    switch (event) {
      case 'virtualcard.transaction.authorization':
        await this.handleAuthorization(payload);
        break;
      case 'virtualcard.transaction.declined':
        await this.handleDeclined(payload);
        break;
      case 'virtualcard.transaction.declined.terminated':
        await this.handleTerminated(payload);
        break;
      case 'virtualcard.topup.complete':
        // HTG debit + VirtualCard.balance increment are already done optimistically
        // by fundVirtualCard() before this webhook arrives — no balance DB write needed here.
        this.logger.log(`[Strowallet][topup.complete] Confirmed recharge cardId=${payload?.cardId} amount=${payload?.amount}`);
        await this.cardTransactionService.recordTopupComplete(payload).catch((err: any) =>
          this.logger.error(`[Strowallet][topup.complete] CardTransaction error: ${err.message}`),
        );
        break;
      case 'otp.code':
        await this.handleOtpCode(payload);
        break;
      default:
        this.logger.warn(`[Strowallet] Unhandled event: ${event}`);
    }

    return { received: true };
  }

  // ── authorization ─────────────────────────────────────────────────────────

  private async handleAuthorization(payload: any) {
    const { cardId, amount, merchant, narrative } = payload;

    if (!cardId || !amount) {
      this.logger.error('[Strowallet][auth] Missing cardId or amount — skipping');
      return;
    }

    try {
      const parsedAmount = parseFloat(amount);

      // Decrement card USD balance to keep local display in sync.
      // History display is now handled entirely by CardTransactionService
      // (richer record: merchant/mcc/narrative — replaces the old ad-hoc
      // Transaction row this used to also create, to avoid a duplicate entry).
      const updated = await this.prisma.virtualCard.updateMany({
        where: { cardId },
        data: { balance: { decrement: parsedAmount } },
      });

      if (updated.count === 0) {
        this.logger.warn(`[Strowallet][auth] Unknown cardId: ${cardId}`);
        return;
      }

      this.logger.log(`[Strowallet][auth] OK cardId=${cardId} -${parsedAmount} USD merchant=${merchant ?? narrative}`);
    } catch (err: any) {
      this.logger.error(`[Strowallet][auth] Error: ${err.message}`);
    }

    await this.cardTransactionService.recordAuthorization(payload).catch((err: any) =>
      this.logger.error(`[Strowallet][auth] CardTransaction error: ${err.message}`),
    );
  }

  // ── declined ──────────────────────────────────────────────────────────────

  private async handleDeclined(payload: any) {
    const { cardId, amount, merchant, narrative, reference } = payload;
    this.logger.warn(`[Strowallet][declined] cardId=${cardId} amount=${amount} merchant=${merchant}`);

    if (!cardId) return;

    try {
      const card = await this.prisma.virtualCard.findUnique({
        where: { cardId },
        include: { user: { include: { wallet: true } } },
      });

      const walletId = card?.user?.wallet?.id;
      if (!walletId) return;

      const parsedAmount = parseFloat(amount ?? '0');
      const description = merchant
        ? `Refize — ${merchant}`
        : (narrative ?? 'Tranzaksyon refize');

      await this.prisma.transaction.create({
        data: {
          reference: reference ?? `STR-DEC-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          senderWalletId: walletId,
          amount: parsedAmount,
          fee: 0,
          netAmount: parsedAmount,
          type: 'PAYMENT',
          status: 'FAILED',
          title: 'Kat Visa Refize',
          description,
        },
      });
    } catch (err: any) {
      this.logger.error(`[Strowallet][declined] Error: ${err.message}`);
    }
  }

  // ── otp.code ──────────────────────────────────────────────────────────────

  private async handleOtpCode(payload: any) {
    const { cardId, authorizationCode, last4, cardBrand, reference } = payload;

    if (!cardId || !authorizationCode) {
      this.logger.error('[Strowallet][otp] Missing cardId or authorizationCode — skipping');
      return;
    }

    const card = await this.prisma.virtualCard.findUnique({
      where: { cardId },
      include: { user: true },
    });
    if (!card) {
      this.logger.warn(`[Strowallet][otp] Unknown cardId: ${cardId}`);
      return;
    }

    // An memwa sèlman, 10 min TTL — pa gen ekri BDD pou kòd la.
    this.cardOtpService.set(card.userId, {
      code: authorizationCode,
      last4: last4 ?? card.last4 ?? undefined,
      cardBrand,
      reference,
    });

    await this.prisma.notification.create({
      data: {
        userId: card.userId,
        title: 'Kòd otorizasyon rive',
        message: `Yon machann mande yon kòd pou konplete yon acha sou kat ou a${last4 ? ` (...${last4})` : ''}. Louvri app la pou wè kòd la — li ekspire nan 10 minit.`,
        type: 'INFO',
      },
    }).catch((err: any) => this.logger.error(`[Strowallet][otp] Notification error: ${err.message}`));

    if (card.user?.email) {
      await this.mailService
        .sendCardOtp(card.user.email, card.user.name ?? 'Kliyan', authorizationCode, last4 ?? card.last4 ?? '', 10)
        .catch((err: any) => this.logger.error(`[Strowallet][otp] Email error: ${err.message}`));
    }

    this.logger.log(`[Strowallet][otp] Delivered OTP notification for userId=${card.userId} cardId=${cardId}`);
  }

  // ── terminated ────────────────────────────────────────────────────────────

  private async handleTerminated(payload: any) {
    this.logger.warn(`[Strowallet][terminated] cardId=${payload?.cardId} eventId=${payload?.id}`);

    try {
      await this.cardTerminationService.handleTerminationEvent(payload);
    } catch (err: any) {
      this.logger.error(`[Strowallet][terminated] Error: ${err.message}`);
    }
  }
}
