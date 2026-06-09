import { Controller, Post, Body, HttpCode, HttpStatus, Logger, Headers, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Controller('v1/webhooks/strowallet')
export class StrowalletWebhookController {
  private readonly logger = new Logger(StrowalletWebhookController.name);

  constructor(private prisma: PrismaService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleStrowalletWebhook(
    @Body() payload: any,
    @Headers('x-strowallet-signature') signature?: string,
  ) {
    const secret = process.env.STROWALLET_WEBHOOK_SECRET;
    if (!secret) {
      throw new UnauthorizedException('Webhook secret non konfigire');
    }
    if (!signature) {
      throw new UnauthorizedException('Signature webhook manke');
    }
    const expected = createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
    let valid = false;
    try {
      valid = timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {}
    if (!valid) {
      throw new UnauthorizedException('Signature webhook envalid');
    }

    this.logger.log(`Webhook resevwa soti nan StroWallet: event=${payload?.event || payload?.event_type}`);

    // StroWallet ka voye jaden 'event' oswa 'event_type'
    const eventType = payload?.event || payload?.event_type;

    if (payload && (eventType === 'card.transaction' || eventType === 'card.transaction.success')) {
      // Rekipere done yo nan payload la san danje
      const data = payload.data || payload; 
      const { card_id, amount, merchant, reference, status } = data;

      const isApproved = status === 'SUCCESS' || status === 'APPROVED' || status === 'successful';

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

    // Toujou retounen 200 OK bay StroWallet pou l pa kontinye voye menm notification an
    return { received: true };
  }
}