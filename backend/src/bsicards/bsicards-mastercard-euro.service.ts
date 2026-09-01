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

  private resolveIdentity(user: {
    name: string | null;
    kyc: { firstName?: string | null; lastName?: string | null } | null;
  }) {
    if (user.kyc?.firstName && user.kyc?.lastName) {
      return { firstname: user.kyc.firstName.trim(), lastname: user.kyc.lastName.trim() };
    }
    const nameParts = (user.name || 'OZAMA USER').trim().split(/\s+/).filter(Boolean);
    const lastname = nameParts[nameParts.length - 1] || 'USER';
    const firstname = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : lastname;
    return { firstname, lastname };
  }

  private async recordCardCreationFailure(userId: string, email: string, errorMessage: string): Promise<void> {
    await this.prisma.cardCreationFailure.create({
      data: { userId, email, context: 'BSICARDS_EUR_CREATE', errorMessage },
    });
  }

  // ─── 0. KREYE KAT (customer-facing, san depo — kat kreye vid, rechaje apre) ──
  // Pa gen "billing address" pou pwodwi sa a (verifye nan API a) ni etap fonn
  // konbine kreye+rechaje — kontrèman ak StroWallet, `create-card` la sèlman
  // bezwen idantite (useremail/firstname/lastname). Kliyan rechaje apre atravè
  // fundCard() pi ba.

  async createCard(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { kyc: true, wallet: true },
    });
    if (!user) throw new NotFoundException('Itilizatè introuvable');
    if (!user.kyc || user.kyc.status !== 'APPROVED') {
      throw new BadRequestException('KYC ou dwe apwouve pou kreye yon kat');
    }

    const existing = await this.findEuroCard(userId);
    if (existing) throw new BadRequestException('Ou genyen yon kat Mastercard EUR deja');

    // BSICards bay chak kat Mastercard EUR yon balans inisyal GRATIS €3.00
    // (konfime nan dokimantasyon: "Cards are issued with an initial provider
    // balance of EUR 3.00"). Desizyon biznis (1 sept 2026, konfime ak
    // itilizatè a): OZAMAPAY fè kliyan an peye pou €3.00 sa a tou (kòm yon
    // depo minimòm nou egzije), PA yon bonus gratis — €7.50 emisyon BSICards
    // la menm rete yon depans ENTÈN OZAMAPAY, li PA touche wallet kliyan an.
    //
    // Verifye balans AVAN rele BSICards — si kliyan an pa gen ase, pa gen
    // rezon depanse vrè €7.50 BSICards la pou yon kat li pa ka peye pou li.
    const rate = await this.getEurHtgRate();
    const INITIAL_DEPOSIT_EUR = 3.0;
    const htgCost = Math.ceil(INITIAL_DEPOSIT_EUR * rate);
    const wallet = user.wallet;
    if (!wallet || Number(wallet.balance) < htgCost) {
      throw new BadRequestException(
        `Balans ensifizan pou depo minimòm €${INITIAL_DEPOSIT_EUR.toFixed(2)} (${htgCost} HTG). Ou bezwen ${htgCost} HTG nan wallet ou.`,
      );
    }

    const { firstname, lastname } = this.resolveIdentity(user);

    let cardId: string;
    let raw: any;
    try {
      raw = await this.bsicardsPost('mastercard-euro/create-card', {
        useremail: user.email,
        firstname,
        lastname,
      });
      cardId = raw?.response?.cardid || raw?.data?.cardid || raw?.cardid || raw?.response?.card_id || raw?.data?.card_id || raw?.card_id;
      if (!cardId) {
        this.logger.error(`BSICards mastercard-euro: pa jwenn cardid nan repons — ${JSON.stringify(raw)}`);
        throw new BadRequestException('BSICards pa retounen cardid');
      }
    } catch (err) {
      await this.recordCardCreationFailure(userId, user.email, (err as any)?.bsicardsDetail ?? (err as any)?.message ?? 'unknown');
      throw err;
    }

    // BSICards deja bay siksè (kat la egziste vrèman kounye a, ak €3.00 sou
    // li) — apati isit la se ekri lokal sèlman, kidonk yo tout ka rantre nan
    // YON SÈL transaction atomik (pa gen apèl API deyò ki ka echwe pi lwen).
    const walletBalanceBefore = Number(wallet.balance);
    const walletBalanceAfter = walletBalanceBefore - htgCost;
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: htgCost } },
      });

      const virtualCard = await tx.virtualCard.create({
        data: {
          userId,
          cardId,
          balance: INITIAL_DEPOSIT_EUR,
          currency: 'EUR',
          brand: 'MASTERCARD',
          provider: PROVIDER,
          status: 'ACTIVE',
        },
      });

      const transaction = await tx.transaction.create({
        data: {
          reference: `BSICARDS-EUR-CREATE-DEPOSIT-${cardId}`,
          senderWalletId: wallet.id,
          amount: htgCost,
          fee: 0,
          netAmount: htgCost,
          type: 'CARD',
          status: 'COMPLETED',
          title: 'Depo inisyal kat Mastercard EUR',
          description: `Depo minimòm €${INITIAL_DEPOSIT_EUR.toFixed(2)} (${htgCost} HTG, to ${rate}) pou kreyasyon kat Mastercard EUR BSICards ${cardId}.`,
        },
      });

      await tx.ledgerEntry.create({
        data: {
          walletId: wallet.id,
          transactionId: transaction.id,
          type: 'DEBIT',
          amount: htgCost,
          balanceBefore: walletBalanceBefore,
          balanceAfter: walletBalanceAfter,
          description: `Depo inisyal €${INITIAL_DEPOSIT_EUR.toFixed(2)} kat Mastercard EUR (${cardId})`,
        },
      });

      return { virtualCard, transaction };
    }, { isolationLevel: 'Serializable' });

    return {
      message: 'Kat Mastercard EUR BSICards kreye.',
      card: result.virtualCard,
      raw: raw?.response ?? raw?.data ?? raw,
    };
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
    const scriptUrl =
      raw?.data?.data?.uri ||
      raw?.response?.data?.uri ||
      raw?.response?.url ||
      raw?.data?.url ||
      raw?.url ||
      raw?.response?.iframe_url ||
      raw?.data?.iframe_url;
    if (!scriptUrl) {
      this.logger.error(`BSICards mastercard-euro: pa jwenn URL nan repons — ${JSON.stringify(raw)}`);
      throw new BadRequestException('Nou pa ka chaje detay kat la kounye a. Eseye ankò.');
    }

    // 1 sept 2026 — KONFIME: `scriptUrl` la PA yon paj HTML pou yon iframe,
    // se yon SCRIPT JS (Content-Type: application/javascript) ki, si l
    // egzekite nan navigatè a, kreye limenm yon iframe ak vrè URL detay kat
    // la (yon domèn separe, business.4payments.io/.../sensitive?authToken=…,
    // ki ekspire nan 2 minit). Nou PA janm egzekite script sa a — nou li
    // TÈKS brit li sèlman, epi ekstrè URL anndan `var url = "..."` ak yon
    // regex. Sa evite egzekite JS deyò nan kontèks aplikasyon nou an.
    const scriptRes = await axios.get(scriptUrl, { responseType: 'text', transformResponse: (r) => r });
    const match = String(scriptRes.data).match(/var\s+url\s*=\s*"([^"]+)"/);
    if (!match) {
      this.logger.error(`BSICards mastercard-euro: pa jwenn URL anndan script la — ${String(scriptRes.data).slice(0, 500)}`);
      throw new BadRequestException('Nou pa ka chaje detay kat la kounye a. Eseye ankò.');
    }

    // Chak URL sa a gen yon authToken ki ekspire nan 2 minit (konfime pa JWT
    // claim "expire":"2m") — PA kachte valè sa a. Chak apèl getSecretDetails
    // dwe refè tout chèn nan (get-sensitive-card + fetch script) pou jwenn
    // yon URL FRESH.
    return {
      secureEmbedUrl: match[1],
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
