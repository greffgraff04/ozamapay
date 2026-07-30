import { Controller, Post, Body, HttpCode, HttpStatus, Logger, Req, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CardTerminationService } from './card-termination.service';
import { CardTransactionService } from './card-transaction.service';

@Controller('v1/webhooks/strowallet')
export class StrowalletWebhookController {
  private readonly logger = new Logger(StrowalletWebhookController.name);

  constructor(
    private prisma: PrismaService,
    private cardTerminationService: CardTerminationService,
    private cardTransactionService: CardTransactionService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleStrowalletWebhook(@Body() payload: any, @Req() req: any) {
    const secret = req.query.secret;
    if (!secret || secret !== process.env.STROWALLET_WEBHOOK_SECRET) {
      throw new UnauthorizedException('Invalid webhook secret');
    }

    const event = payload?.event as string | undefined;
    this.logger.log(`[Strowallet] event=${event} | ${JSON.stringify(payload)}`);

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
