import { Controller, Post, Body, HttpCode, HttpStatus, Logger, Req, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('v1/webhooks/strowallet')
export class StrowalletWebhookController {
  private readonly logger = new Logger(StrowalletWebhookController.name);

  constructor(private prisma: PrismaService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleStrowalletWebhook(
    @Body() payload: any,
    @Req() req: any,
  ) {
    const secret = req.query.secret;
    if (!secret || secret !== process.env.STROWALLET_WEBHOOK_SECRET) {
      throw new UnauthorizedException('Invalid webhook secret');
    }

    // Log the raw event type so we can see exactly what Strowallet sends
    const eventType = payload?.event || payload?.event_type;
    this.logger.log(`Webhook resevwa soti nan StroWallet: event=${eventType} | payload=${JSON.stringify(payload)}`);

    // Strowallet bitvcard sends "virtualcard.transaction" for card purchases.
    // Also accept legacy variants in case they change it.
    const isCardTx = eventType === 'virtualcard.transaction'
      || eventType === 'card.transaction'
      || eventType === 'card.transaction.success';

    if (payload && isCardTx) {
      // Strowallet nests card data inside a "data" field
      const data = payload.data || payload;
      const { card_id, amount, merchant, reference, status } = data;

      // Strowallet uses "SUCCESSFUL"; accept all known approval values
      const isApproved = status === 'SUCCESSFUL' || status === 'SUCCESS'
        || status === 'APPROVED' || status === 'successful';

      if (isApproved && card_id && amount) {
        try {
          await this.prisma.$transaction(async (tx) => {
            // Chache kat la ak tout wallet mèt kat la
            const virtualCard = await tx.virtualCard.findUnique({
              where: { cardId: card_id },
              include: { user: { include: { wallet: true } } }
            });

            if (!virtualCard) {
              this.logger.warn(`[Webhook] Kat vityèl avèk ID ${card_id} pa egziste nan database la.`);
              return;
            }

            const walletId = virtualCard.user.wallet?.id;
            if (!walletId) {
              this.logger.error(`[Webhook] Itilizatè a pa gen Wallet lokal pou lye tranzaksyon an.`);
              return; // Evite mete null pou Prisma pa kase
            }

            const parsedAmount = Number(amount);

            // 1. Desann balans kat la nan database nou an
            await tx.virtualCard.update({
              where: { cardId: card_id },
              data: { balance: { decrement: parsedAmount } }
            });

            // 2. Kreye istorik tranzaksyon an pou itilizatè a ka wè l sou Next.js
            await tx.transaction.create({
              data: {
                reference: reference || `STR-TX-${Date.now()}`,
                senderWalletId: walletId, // RANJE! Pa gen null ankò
                amount: parsedAmount,
                fee: 0.00,
                netAmount: parsedAmount,
                type: 'PAYMENT',
                status: 'COMPLETED',
                title: 'Peman kat Visa',
                description: merchant ? `Peman kat Visa — ${merchant}` : 'Peman kat Visa',
              }
            });

            this.logger.log(`[Webhook] [Siksè] Balans kat ${card_id} mete ajou: -${parsedAmount} USD`);
          });
        } catch (error: any) {
          this.logger.error(`[Webhook] Erreur pandan tretman tranzaksyon: ${error.message}`);
        }
      }
    }

    if (!isCardTx) {
      this.logger.warn(`[Webhook] Evènman enkoni oswa pa sipòte: ${eventType}`);
    }

    // Always return 200 so Strowallet does not keep retrying
    return { received: true };
  }
}