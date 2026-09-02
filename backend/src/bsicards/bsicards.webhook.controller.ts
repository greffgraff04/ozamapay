import { Controller, Post, Body, HttpCode, HttpStatus, Logger, Req, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Menm patèn ak StrowalletWebhookController (v1/webhooks/strowallet) —
// piblik (pa gen JwtAuthGuard), pwoteje pa yon sekrè nan query string
// (?secret=), idempotence via yon tab dedye (BsicardsWebhookEvent).
//
// AVÈTISMAN (2 sept 2026): dokimantasyon BSICards PA konfime okenn mekanis
// pou nou konfigire URL sa a bò kote yo, e sèl egzanp payload nou jwenn nan
// dokimantasyon an se yon evènman STATUS=FAILED (pa gen egzanp SIKSÈ konfime)
// — kòd sa a ekri defansif (validasyon strik, log konplè, pa janm krache
// yon erè ki ta anpeche BSICards konsidere webhook la "resevwa"), pou li
// pare si/lè BSICards konfime yon fason pou anrejistre URL sa a bò kote yo.
// Pa gen okenn apèl reyèl konfime kont fòma sa a jouk kounye a.
@Controller('v1/webhooks/bsicards')
export class BSICardsWebhookController {
  private readonly logger = new Logger(BSICardsWebhookController.name);

  constructor(private prisma: PrismaService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleBsicardsWebhook(@Body() payload: any, @Req() req: any) {
    const secret = req.query.secret;
    if (!secret || secret !== process.env.BSICARDS_WEBHOOK_SECRET) {
      throw new UnauthorizedException('Invalid webhook secret');
    }

    const type = payload?.type as string | undefined;
    this.logger.log(`[BSICards] type=${type} | ${JSON.stringify(payload)}`);

    switch (type) {
      case 'transaction':
        await this.handleTransaction(payload).catch((err: any) =>
          this.logger.error(`[BSICards][transaction] Error: ${err.message}`),
        );
        break;
      default:
        this.logger.warn(`[BSICards] Unhandled webhook type: ${type}`);
    }

    return { received: true };
  }

  // ── transaction (acha/depans sou kat la) ────────────────────────────────────

  private async handleTransaction(payload: any) {
    const data = payload?.data ?? {};
    const cardId = data?.cardId as string | undefined;
    const eventId = data?.id as string | undefined;

    if (!cardId || !eventId) {
      this.logger.error('[BSICards][transaction] Payload san cardId oswa id — skip');
      return;
    }

    if (!(await this.claimEvent(eventId, payload))) return; // deja trete

    // Sèl pwodwi BSICards customer-facing kounye a se Mastercard EUR — filtre
    // pa provider anpeche yon eventId ki ta koenside ak yon lòt pwodwi/tès.
    const card = await this.prisma.virtualCard.findFirst({
      where: { cardId, provider: 'BSICARDS_MASTERCARD_EUR' },
    });
    if (!card) {
      this.logger.warn(`[BSICards][transaction] Kat enkoni oswa pa Mastercard EUR: cardId=${cardId}`);
      return;
    }

    const status = String(data?.status ?? '').toUpperCase();
    const isFailure = ['FAILED', 'DECLINED', 'REJECTED'].includes(status);

    // `settledAmount` se sa ki reyèlman dediwi sou balans kat la (nan moni
    // kat la, apre konvèsyon si acha a te fèt nan yon lòt moni — wè egzanp
    // dokimantasyon: amount=52.5 USD, settledAmount=45.64). `amount` sèvi kòm
    // filè sekirite si `settledAmount` pa la.
    const rawAmount = data?.settledAmount ?? data?.amount;
    const amount = Number(rawAmount);
    const validAmount = Number.isFinite(amount) && amount > 0;

    // Anrejistre CardTransaction pou TOUT evènman (siksè kou echwe) — istorik
    // konplè, pa jis balans final la. Reyitilize CardTransactionType.AUTHORIZATION
    // (menm valè ak StroWallet) olye ajoute yon nouvo valè enum — evite yon
    // migrasyon anplis, e fwontyè a deja konprann "AUTHORIZATION" kòm "yon
    // acha kat" san chanjman.
    await this.prisma.cardTransaction.upsert({
      where: { reference: eventId },
      create: {
        userId: card.userId,
        cardId,
        reference: eventId,
        type: 'AUTHORIZATION',
        amount: validAmount ? amount : 0,
        currency: card.currency,
        status,
        merchant: data?.merchant ?? null,
        narrative: null,
        mcc: null,
        country: null,
        occurredAt: new Date(),
      },
      update: {},
    });

    if (isFailure) {
      this.logger.warn(`[BSICards][transaction] DECLINED cardId=${cardId} amount=${rawAmount} merchant=${data?.merchant}`);
      return;
    }

    if (!validAmount) {
      this.logger.error(`[BSICards][transaction] Montan envalid nan payload siksè a — pa touche balans. cardId=${cardId} payload=${JSON.stringify(data)}`);
      return;
    }

    await this.prisma.virtualCard.update({
      where: { cardId },
      data: { balance: { decrement: amount } },
    });

    await this.prisma.notification.create({
      data: {
        userId: card.userId,
        title: 'Tranzaksyon kat',
        message: `-€${amount.toFixed(2)} — ${data?.merchant ?? 'Peman kat Mastercard EUR'}`,
        type: 'INFO',
      },
    }).catch((err: any) => this.logger.error(`[BSICards][transaction] Notification error: ${err.message}`));

    this.logger.log(`[BSICards][transaction] OK cardId=${cardId} -€${amount} merchant=${data?.merchant}`);
  }

  // Menm mekanis "claim-first" ak CardTransactionService.claimEvent (StroWallet).
  private async claimEvent(eventId: string, payload: any): Promise<boolean> {
    try {
      await this.prisma.bsicardsWebhookEvent.create({
        data: { eventId, event: payload?.type ?? 'unknown', rawPayload: payload },
      });
      return true;
    } catch (err: any) {
      if (err?.code === 'P2002') {
        this.logger.log(`[BSICards] eventId=${eventId} deja trete — ignore`);
        return false;
      }
      throw err;
    }
  }
}
