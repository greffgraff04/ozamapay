import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

const PROVIDER = 'BSICARDS_MASTERCARD_EUR';
const RATE_KEY = 'EUR_HTG';

@Injectable()
export class BSICardsMastercardEuroService {
  private readonly logger = new Logger(BSICardsMastercardEuroService.name);
  private readonly BASE_URL: string;
  private readonly PUBLIC_KEY: string;
  private readonly SECRET_KEY: string;
  private readonly MASTER_ID = process.env.OZAMAPAY_MASTER_ID as string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.BASE_URL = this.config.get<string>('BSICARDS_BASE_URL') ?? 'https://cards.bsigroup.tech/api/';
    this.PUBLIC_KEY = this.config.get<string>('BSICARDS_PUBLIC_KEY') ?? '';
    this.SECRET_KEY = this.config.get<string>('BSICARDS_SECRET_KEY') ?? '';
  }

  // ─── HELPERS ───────────────────────────────────────────────────────────────

  private async bsicardsPost(endpoint: string, body: Record<string, unknown>) {
    const url = `${this.BASE_URL}${endpoint}`;
    let data: any;
    try {
      ({ data } = await axios.post(url, body, {
        headers: { publickey: this.PUBLIC_KEY, secretkey: this.SECRET_KEY },
      }));
    } catch (error: any) {
      const detail = error?.response?.data;
      this.logger.error(`BSICards API error [${endpoint}]: ${JSON.stringify(detail) ?? error?.message}`);
      throw this.bsicardsFailure(detail ?? error?.message);
    }
    if (data?.success === false || data?.status === false) {
      this.logger.error(`BSICards error [${endpoint}]: ${JSON.stringify(data)}`);
      throw this.bsicardsFailure(data);
    }
    return data;
  }

  private bsicardsFailure(detail: unknown): BadRequestException {
    const err = new BadRequestException('Nou rankontre yon pwoblèm teknik. Tanpri eseye ankò pita oswa kontakte sipò OZAMAPAY.');
    (err as any).bsicardsDetail = typeof detail === 'string' ? detail : JSON.stringify(detail);
    return err;
  }

  private async findEuroCard(userId: string) {
    return this.prisma.virtualCard.findFirst({
      where: { userId, provider: PROVIDER, status: { in: ['ACTIVE', 'FROZEN'] } },
    });
  }

  private async getEurHtgRate(): Promise<number> {
    const rate = await this.prisma.rate.findUnique({ where: { key: RATE_KEY } });
    if (!rate) throw new BadRequestException('Taux de change EUR introuvable');
    return Number(rate.value);
  }

  // ─── 1. WÈ INFO (detay sansib, iframe sekirize) ─────────────────────────────

  async getSecretDetails(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Itilizatè introuvable');

    const card = await this.findEuroCard(userId);
    if (!card) throw new NotFoundException('Ou pa gen yon kat Mastercard EUR');

    const raw = await this.bsicardsPost('mastercard-euro/get-sensitive-card', {
      useremail: user.email,
      cardid: card.cardId,
    });

    // Fòm repons lan konfime pa yon vrè tès (31 out 2026): { data: { data:
    // { uri } } } — URL iframe la nan `data.data.uri`. Gade plizyè lòt fòm
    // posib tou kòm filè sekirite si BSICards chanje l pita.
    const url =
      raw?.data?.data?.uri ||
      raw?.response?.data?.uri ||
      raw?.response?.url ||
      raw?.data?.url ||
      raw?.url ||
      raw?.response?.iframe_url ||
      raw?.data?.iframe_url;
    if (!url) {
      this.logger.error(`BSICards mastercard-euro: pa jwenn URL nan repons — ${JSON.stringify(raw)}`);
    }

    // 1 sept 2026 — `secureEmbedUrl` (pa `cardNumberUrl`/`cvvUrl` StroWallet
    // yo) espre: BSICards retounen YON SÈL iframe konbine ki montre nimewo +
    // CVV + ekspirasyon ansanm (carddetails.cardnumber/cvv toujou null nan
    // repons lan — done sa yo SÈLMAN vizib nan iframe a). Fwontyè a dwe
    // afiche sa kòm YON iframe plen-laj, pa eseye ranpli yon grid 3-bwat.
    return {
      secureEmbedUrl: url,
      last4: card.last4,
      balance: Number(card.balance),
    };
  }

  // ─── 2. RECHAJE (soti nan wallet HTG kliyan an, PA depo kripto) ─────────────
  // Modèl: OZAMAPAY kenbe yon balans EUR jeneral sou BSICards (eurbalance,
  // rechaje manyèlman pa admin ak kripto). Lè yon kliyan rechaje PWÒP kat li,
  // nou debite wallet HTG li, konvèti an EUR, epi rele BSICards pou transfere
  // soti nan balans jeneral la rive sou kat espesifik li a — menm modèl ak
  // StrowalletService.fundVirtualCard, sèlman BSICards se founisè a.
  //
  // ZEWO maj OZAMAPAY pou kounye a (konfime 31 out 2026, se yon tès) — jis
  // konvèsyon nan to EUR_HTG. `amountHtg` se yon montan HTG (SOUS), PA yon
  // montan EUR sib — kontrèman ak StrowalletService.fundVirtualCard ki pran
  // yon montan USD SIB. Sa vle di chan `amount_usd` nan DTO CardsService la
  // reprezante yon bagay diferan selon provider a (wè CardsService).

  async fundCard(userId: string, amountHtg: number) {
    amountHtg = Number(amountHtg);
    if (!Number.isFinite(amountHtg) || amountHtg <= 0) {
      throw new BadRequestException('Montan envalid');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Itilizatè introuvable');

    const card = await this.findEuroCard(userId);
    if (!card) throw new NotFoundException('Ou pa gen yon kat Mastercard EUR');
    if (card.status !== 'ACTIVE') throw new BadRequestException('Kat ou a pa aktif');

    const rate = await this.getEurHtgRate();
    const amountEur = Math.round((amountHtg / rate) * 100) / 100;
    if (amountEur <= 0) throw new BadRequestException('Montan twò piti apre konvèsyon');

    const wallet = await this.prisma.wallet.findFirst({ where: { userId } });
    if (!wallet || Number(wallet.balance) < amountHtg) {
      throw new BadRequestException(`Balans ennsifizan. Ou bezwen ${amountHtg} HTG`);
    }

    // ── Etap 1: Debi wallet sèlman (transaction 1) ──────────────────────────
    await this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { userId },
        data: { balance: { decrement: amountHtg } },
      });
    });

    // ── Etap 2: Apèl HTTP BSICards DEYÒ transaction ──────────────────────────
    try {
      await this.bsicardsPost('mastercard-euro/fund-card', {
        useremail: user.email,
        cardid: card.cardId,
        amount: amountEur,
      });
    } catch (err) {
      // ── Etap 3: BSICards echwe → renmbi wallet (NOUVO transaction) ────────
      await this.prisma.$transaction(async (tx) => {
        await tx.wallet.update({
          where: { userId },
          data: { balance: { increment: amountHtg } },
        });
        await tx.transaction.create({
          data: {
            senderWalletId: wallet.id,
            type: 'CARD',
            amount: amountHtg,
            netAmount: amountHtg,
            fee: 0,
            status: 'FAILED',
            description: `Recharge kat Mastercard EUR €${amountEur} ECHWE — renmbi otomatik fèt`,
            reference: `BSICARDS-EUR-FUND-FAIL-${card.cardId}-${Date.now()}`,
          },
        });
      });
      throw err;
    }

    // ── Etap 4: BSICards siksè → update VirtualCard balance (NOUVO transaction) ──
    await this.prisma.$transaction(async (tx) => {
      await tx.virtualCard.update({
        where: { cardId: card.cardId },
        data: { balance: { increment: amountEur } },
      });
      await tx.transaction.create({
        data: {
          senderWalletId: wallet.id,
          type: 'CARD',
          amount: amountHtg,
          netAmount: amountHtg,
          fee: 0,
          status: 'COMPLETED',
          description: `Recharge kat Mastercard EUR €${amountEur} (${amountHtg} HTG, to ${rate})`,
          reference: `BSICARDS-EUR-FUND-${card.cardId}-${Date.now()}`,
        },
      });
    });

    return { message: `Kat rechaje avèk siksè — €${amountEur} ajoute`, amountEur, amountHtg };
  }
}
