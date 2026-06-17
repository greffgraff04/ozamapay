import { Controller, Post, Body, HttpCode, HttpStatus, Logger, Req, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('v1/webhooks/strowallet')
export class StrowalletWebhookController {
  private readonly logger = new Logger(StrowalletWebhookController.name);

  constructor(private prisma: PrismaService) {}

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
        // by fundVirtualCard() before this webhook arrives — no DB write needed.
        this.logger.log(`[Strowallet][topup.complete] Confirmed recharge cardId=${payload?.cardId} amount=${payload?.amount}`);
        break;
      default:
        this.logger.warn(`[Strowallet] Unhandled event: ${event}`);
    }

    return { received: true };
  }

  // ── authorization ─────────────────────────────────────────────────────────

  private async handleAuthorization(payload: any) {
    const { cardId, amount, merchant, narrative, reference } = payload;

    if (!cardId || !amount) {
      this.logger.error('[Strowallet][auth] Missing cardId or amount — skipping');
      return;
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        const card = await tx.virtualCard.findUnique({
          where: { cardId },
          include: { user: { include: { wallet: true } } },
        });

        if (!card) {
          this.logger.warn(`[Strowallet][auth] Unknown cardId: ${cardId}`);
          return;
        }

        const walletId = card.user.wallet?.id;
        if (!walletId) {
          this.logger.error(`[Strowallet][auth] No HTG wallet for userId=${card.userId}`);
          return;
        }

        const parsedAmount = parseFloat(amount);
        const description = merchant
          ? `Visa — ${merchant}`
          : (narrative ?? 'Peman kat Visa');

        // Decrement card USD balance to keep local display in sync
        await tx.virtualCard.update({
          where: { cardId },
          data: { balance: { decrement: parsedAmount } },
        });

        // Record for transaction history display.
        // senderWalletId = owner's HTG wallet (ownership link only — HTG balance is NOT touched).
        await tx.transaction.create({
          data: {
            reference: reference ?? `STR-AUTH-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            senderWalletId: walletId,
            amount: parsedAmount,
            fee: 0,
            netAmount: parsedAmount,
            type: 'PAYMENT',
            status: 'COMPLETED',
            title: 'Peman kat Visa',
            description,
          },
        });

        this.logger.log(`[Strowallet][auth] OK cardId=${cardId} -${parsedAmount} USD merchant=${merchant ?? narrative}`);
      });
    } catch (err: any) {
      this.logger.error(`[Strowallet][auth] Error: ${err.message}`);
    }
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
    const { cardId } = payload;
    this.logger.warn(`[Strowallet][terminated] cardId=${cardId}`);

    if (!cardId) return;

    try {
      await this.prisma.virtualCard.update({
        where: { cardId },
        data: { status: 'TERMINATED' },
      });
      this.logger.log(`[Strowallet][terminated] Card ${cardId} marked TERMINATED`);
    } catch (err: any) {
      this.logger.error(`[Strowallet][terminated] Error: ${err.message}`);
    }
  }
}
