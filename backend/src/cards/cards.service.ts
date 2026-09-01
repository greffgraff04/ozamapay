import { BadRequestException, Injectable, NotFoundException, NotImplementedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StrowalletService } from '../strowallet/strowallet.service';
import { BSICardsMastercardEuroService } from '../bsicards/bsicards-mastercard-euro.service';

const STROWALLET = 'STROWALLET_NFC';
const BSICARDS_EUR = 'BSICARDS_MASTERCARD_EUR';

// Facade/router miltip-provider pou fonksyon kliyan yo (v1/cards/*). Pa yon
// entèfas komen ki fòse StrowalletService ak sèvis BSICards yo swiv menm
// siyati — yo pa senmetrik (BSICards pa gen "fund" dirèk pou tout pwodwi,
// pa gen "secret-details" pou newvisa/mastercard-usd, elatriye). Sèvi sa a
// jis gade card.provider nan BDD epi delege bay bon sèvis la, oswa retounen
// yon 501 kl è si operasyon an poko sipòte pou provider sa a.
//
// 1 sept 2026 — yon itilizatè ka gen JISK 1 kat pa PROVIDER an menm tan
// (StroWallet + BSICards EUR posib ansanm), wè getMyCards/resolveCard.
// findAnyActiveOrFrozenCard rete pou konpatibilite ak aparèy ki pa voye
// cardId (app mobil la) — li chwazi premye kat aktif/frozen ki jwenn nan
// nenpòt provider, egzakteman kòm avan.
@Injectable()
export class CardsService {
  constructor(
    private prisma: PrismaService,
    private strowalletService: StrowalletService,
    private bsicardsEuroService: BSICardsMastercardEuroService,
  ) {}

  private async findAnyActiveOrFrozenCard(userId: string) {
    return (
      (await this.prisma.virtualCard.findFirst({ where: { userId, status: 'ACTIVE' } })) ??
      (await this.prisma.virtualCard.findFirst({ where: { userId, status: 'FROZEN' } }))
    );
  }

  // cardId bay → dwe apatyen a itilizatè a e dwe ACTIVE/FROZEN, sinon 404.
  // cardId absan → konpòtman ansyen an (premye kat jwenn nan nenpòt provider),
  // pou aparèy ki poko voye cardId (app mobil la) kontinye fonksyone.
  private async resolveCard(userId: string, cardId?: string) {
    if (!cardId) return this.findAnyActiveOrFrozenCard(userId);
    const card = await this.prisma.virtualCard.findFirst({
      where: { userId, cardId, status: { in: ['ACTIVE', 'FROZEN'] } },
    });
    if (!card) throw new NotFoundException('Kat sa a pa jwenn pou kont ou a');
    return card;
  }

  async getMyCards(userId: string) {
    const cards = await this.prisma.virtualCard.findMany({
      where: { userId, status: { in: ['ACTIVE', 'FROZEN'] } },
      orderBy: { createdAt: 'asc' },
    });
    // Yon itilizatè pa ka gen plis pase 1 kat StroWallet, kidonk sa a se
    // pi plis 1 apèl siplemantè pou sync balans live (menm apèl ak getMyCard).
    return Promise.all(
      cards.map((card) =>
        card.provider === STROWALLET ? this.strowalletService.getMyCardLocalData(userId) : card,
      ),
    );
  }

  async createCard(userId: string, provider: string, amountUsd?: number) {
    if (provider === STROWALLET) {
      return this.strowalletService.createAndFundCard(userId, Number(amountUsd));
    }
    if (provider === BSICARDS_EUR) {
      return this.bsicardsEuroService.createCard(userId);
    }
    throw new BadRequestException('Provider kat envalid');
  }

  async getMyCard(userId: string) {
    const card = await this.findAnyActiveOrFrozenCard(userId);
    if (!card) return null;

    // StroWallet: delege bay getMyCardLocalData (li fè sync balans live).
    // BSICards: pa gen sync live pou kounye a, retounen liy VirtualCard la.
    if (card.provider === STROWALLET) {
      return this.strowalletService.getMyCardLocalData(userId);
    }
    return card;
  }

  async getSecretDetails(userId: string, cardId?: string) {
    const card = await this.resolveCard(userId, cardId);
    if (!card) return this.strowalletService.getCardSecretDetails(userId); // menm mesaj erè "pa gen kat" ak avan

    if (card.provider === STROWALLET) {
      return this.strowalletService.getCardSecretDetails(userId);
    }
    if (card.provider === BSICARDS_EUR) {
      return this.bsicardsEuroService.getSecretDetails(userId);
    }
    throw new NotImplementedException('Fonksyon sa a poko disponib pou kat ou a.');
  }

  // NÒT: `amount` reprezante yon bagay diferan selon provider a — montan USD
  // SIB pou StroWallet (kontra egzistan ak fwontend, `amount_usd`), men yon
  // montan HTG SOUS pou BSICards EUR (konvèti an EUR anndan
  // BSICardsMastercardEuroService.fundCard). Wè kòmantè nan sèvis sa a.
  async fundCard(userId: string, amount: number, cardId?: string) {
    const card = await this.resolveCard(userId, cardId);
    if (!card) return this.strowalletService.fundVirtualCard(userId, amount); // menm mesaj erè "pa gen kat" ak avan

    if (card.provider === STROWALLET) {
      return this.strowalletService.fundVirtualCard(userId, amount);
    }
    if (card.provider === BSICARDS_EUR) {
      return this.bsicardsEuroService.fundCard(userId, amount);
    }
    throw new NotImplementedException('Rechaje pa disponib pou kat ou a pou kounye a. Kontakte sipò OZAMAPAY.');
  }

  async freezeCard(userId: string, cardId?: string) {
    const card = await this.resolveCard(userId, cardId);
    if (!card) return this.strowalletService.freezeCard(userId); // menm mesaj erè "pa gen kat" ak avan

    if (card.provider === STROWALLET) {
      return this.strowalletService.freezeCard(userId);
    }
    throw new NotImplementedException('Bloke pa disponib pou kat ou a pou kounye a. Kontakte sipò OZAMAPAY.');
  }

  async unfreezeCard(userId: string, cardId?: string) {
    const card = cardId
      ? await this.prisma.virtualCard.findFirst({ where: { userId, cardId, status: 'FROZEN' } })
      : await this.prisma.virtualCard.findFirst({ where: { userId, status: 'FROZEN' } });
    if (cardId && !card) throw new NotFoundException('Kat sa a pa jwenn pou kont ou a');
    if (!card) return this.strowalletService.unfreezeCard(userId); // menm mesaj erè "pa gen kat" ak avan

    if (card.provider === STROWALLET) {
      return this.strowalletService.unfreezeCard(userId);
    }
    throw new NotImplementedException('Debloke pa disponib pou kat ou a pou kounye a. Kontakte sipò OZAMAPAY.');
  }
}
