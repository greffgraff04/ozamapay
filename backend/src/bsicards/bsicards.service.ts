import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

const PROVIDER = 'BSICARDS_NEWVISA';

@Injectable()
export class BSICardsService {
  private readonly logger = new Logger(BSICardsService.name);
  private readonly BASE_URL: string;
  private readonly PUBLIC_KEY: string;
  private readonly SECRET_KEY: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.BASE_URL = this.config.get<string>('BSICARDS_BASE_URL') ?? 'https://cards.bsigroup.tech/api/';
    this.PUBLIC_KEY = this.config.get<string>('BSICARDS_PUBLIC_KEY') ?? '';
    this.SECRET_KEY = this.config.get<string>('BSICARDS_SECRET_KEY') ?? '';
  }

  // ─── HELPER ────────────────────────────────────────────────────────────────

  private async bsicardsPost(endpoint: string, body: Record<string, unknown>) {
    // Pa gen trailing slash — kontrèman ak StroWallet, wout Laravel BSICards
    // yo (28 out 2026, konfime pa echèk tès reyèl) redirije '/create-card/'
    // → '/create-card' sou yon 301/302, epi axios konvèti POST an GET sou
    // redireksyon sa a — sa lakòz "GET method not supported".
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

  // Menm konvansyon ak StrowalletService.strowalletFailure: kliyan/admin wè
  // yon mesaj jenerik, detay brit la rete nan `bsicardsDetail` (admin-sèlman).
  private bsicardsFailure(detail: unknown): BadRequestException {
    const err = new BadRequestException('Nou rankontre yon pwoblèm teknik. Tanpri eseye ankò pita oswa kontakte sipò OZAMAPAY.');
    (err as any).bsicardsDetail = typeof detail === 'string' ? detail : JSON.stringify(detail);
    return err;
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

  // 31 out 2026 — chanje pou filtre pa provider: yon itilizatè ka gen yon
  // sèl kat aktif/frozen PA FOUNISÈ (1 StroWallet + 1 BSICards posib an menm
  // tan), olye règ ansyen an ki te bloke yon dezyèm kat total kèlkeswa
  // founisè. StrowalletService.findActiveOrFrozenCard poko chanje pou
  // matche — men filtre pa PROVIDER isit la.
  private async findActiveOrFrozenCard(userId: string) {
    return (
      (await this.prisma.virtualCard.findFirst({ where: { userId, provider: PROVIDER, status: 'ACTIVE' } })) ??
      (await this.prisma.virtualCard.findFirst({ where: { userId, provider: PROVIDER, status: 'FROZEN' } }))
    );
  }

  private async recordCardCreationFailure(userId: string, email: string, errorMessage: string): Promise<void> {
    await this.prisma.cardCreationFailure.create({
      data: { userId, email, context: 'BSICARDS_CREATE', errorMessage },
    });
  }

  // ─── 1. CREATE CARD (admin-only, pa gen finansman otomatik) ─────────────────
  // BSICards pa gen yon apèl "fund" — kat la finanse pa yon depo kripto (min
  // $4) voye sou adrès ke create-card retounen an. Faz sa a kreye kat la
  // sèlman; finansman an fèt manyèlman jiskaske entegrasyon an pwouve stab.

  async createCard(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { kyc: true },
    });
    if (!user) throw new NotFoundException('Itilizatè introuvable');
    if (!user.kyc || user.kyc.status !== 'APPROVED') {
      throw new BadRequestException('KYC ou dwe apwouve pou kreye yon kat');
    }

    const existing = await this.findActiveOrFrozenCard(userId);
    if (existing) throw new BadRequestException('Ou genyen yon kat vityèl deja');

    const { firstname, lastname } = this.resolveIdentity(user);

    let cardId: string;
    let raw: any;
    try {
      raw = await this.bsicardsPost('newvisa/create-card', {
        useremail: user.email,
        firstname,
        lastname,
      });
      cardId = raw?.response?.cardid || raw?.data?.cardid || raw?.cardid;
      if (!cardId) throw new BadRequestException('BSICards pa retounen cardid');
    } catch (err) {
      await this.recordCardCreationFailure(userId, user.email, (err as any)?.bsicardsDetail ?? (err as any)?.message ?? 'unknown');
      throw err;
    }

    const virtualCard = await this.prisma.virtualCard.create({
      data: {
        userId,
        cardId,
        balance: 0,
        currency: 'USD',
        provider: PROVIDER,
        status: 'ACTIVE',
      },
    });

    return {
      message: 'Kat BSICards kreye. Kat la poko finanse — depo kripto manyèl obligatwa.',
      card: virtualCard,
      depositAddresses: raw?.response ?? raw?.data ?? raw,
    };
  }

  // ─── 2. GET CARD (detay + adrès depo, live passthrough) ─────────────────────

  async getCard(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Itilizatè introuvable');

    const card = await this.prisma.virtualCard.findFirst({
      where: { userId, provider: PROVIDER, status: { in: ['ACTIVE', 'FROZEN'] } },
    });
    if (!card) throw new NotFoundException('Ou pa gen yon kat BSICards');

    return this.bsicardsPost('newvisa/get-card', { useremail: user.email, cardid: card.cardId });
  }

  // ─── 3. GET ALL CARDS (debug — pa touche done lokal) ─────────────────────────

  async getAllCards(email: string) {
    return this.bsicardsPost('newvisa/get-all-cards', { useremail: email });
  }

  // ─── 4. BLOCK / UNBLOCK ──────────────────────────────────────────────────────

  async blockCard(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Itilizatè introuvable');

    const card = await this.findActiveOrFrozenCard(userId);
    if (!card || card.provider !== PROVIDER) throw new NotFoundException('Ou pa gen yon kat BSICards');

    await this.bsicardsPost('newvisa/block-card', { useremail: user.email, cardid: card.cardId });

    return this.prisma.virtualCard.update({
      where: { cardId: card.cardId },
      data: { status: 'FROZEN' },
    });
  }

  async unblockCard(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Itilizatè introuvable');

    const card = await this.prisma.virtualCard.findFirst({
      where: { userId, provider: PROVIDER, status: 'FROZEN' },
    });
    if (!card) throw new NotFoundException('Ou pa gen yon kat BSICards bloke');

    await this.bsicardsPost('newvisa/unblock-card', { useremail: user.email, cardid: card.cardId });

    return this.prisma.virtualCard.update({
      where: { cardId: card.cardId },
      data: { status: 'ACTIVE' },
    });
  }
}
