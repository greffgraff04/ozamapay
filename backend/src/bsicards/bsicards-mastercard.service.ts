import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

const PROVIDER = 'BSICARDS_MASTERCARD_USD';

@Injectable()
export class BSICardsMastercardService {
  private readonly logger = new Logger(BSICardsMastercardService.name);
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

  // ─── HELPERS ───────────────────────────────────────────────────────────────

  private async fetchImageBlob(url: string): Promise<Blob> {
    const { data, headers } = await axios.get(url, { responseType: 'arraybuffer' });
    const contentType = (headers['content-type'] as string) || 'image/jpeg';
    return new Blob([data], { type: contentType });
  }

  private async bsicardsMultipartPost(endpoint: string, form: FormData) {
    const url = `${this.BASE_URL}${endpoint}`;
    let data: any;
    try {
      ({ data } = await axios.post(url, form, {
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

  // Menm konvansyon ak BSICardsService.bsicardsFailure / StrowalletService.strowalletFailure.
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

  // Menm règ ak BSICardsService.findActiveOrFrozenCard (31 out 2026) — filtre
  // pa provider: yon itilizatè ka gen 1 kat pa PRODWI BSICards (newvisa +
  // mastercard-usd posib an menm tan), pa jis 1 kat pa founisè jeneral.
  private async findActiveOrFrozenCard(userId: string) {
    return (
      (await this.prisma.virtualCard.findFirst({ where: { userId, provider: PROVIDER, status: 'ACTIVE' } })) ??
      (await this.prisma.virtualCard.findFirst({ where: { userId, provider: PROVIDER, status: 'FROZEN' } }))
    );
  }

  private async recordCardCreationFailure(userId: string, email: string, errorMessage: string): Promise<void> {
    await this.prisma.cardCreationFailure.create({
      data: { userId, email, context: 'BSICARDS_MASTERCARD_CREATE', errorMessage },
    });
  }

  // ─── CREATE CARD (admin-only, "Digital USD Mastercard") ────────────────────
  // KYC done nou genyen se SÈLMAN 1 imaj (idImage) — pa gen chan documentBack
  // separe nan Kyc modèl la, e pou kèk itilizatè (egz. oliviergreffin20)
  // userPhoto se yon placeholder tèks ("strowallet-verified"), pa yon vrè
  // selfie. Konfime eksplisitman pa itilizatè a (31 out 2026): pou premye
  // tès sa a, itilize idImage pou TOUT 3 chan yo (documentFront, documentBack,
  // selfie) — pa yon vrè verso/selfie separe.

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
    if (existing) throw new BadRequestException('Ou genyen yon kat Mastercard USD deja');

    const { firstname, lastname } = this.resolveIdentity(user);

    let cardId: string;
    let raw: any;
    try {
      const idImageBlob = await this.fetchImageBlob(user.kyc.idImage);

      const form = new FormData();
      form.append('firstname', firstname);
      form.append('lastname', lastname);
      form.append('useremail', user.email);
      form.append('documentFront', idImageBlob, 'document-front.jpg');
      form.append('documentBack', idImageBlob, 'document-back.jpg');
      form.append('selfie', idImageBlob, 'selfie.jpg');

      raw = await this.bsicardsMultipartPost('corpexpenses-mastercard-usd/create-card', form);
      cardId = raw?.response?.cardid || raw?.data?.cardid || raw?.cardid || raw?.response?.card_id || raw?.data?.card_id || raw?.card_id;
      if (!cardId) {
        this.logger.error(`BSICards mastercard-usd: pa jwenn cardid nan repons — ${JSON.stringify(raw)}`);
        throw new BadRequestException('BSICards pa retounen cardid');
      }
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
      message: 'Kat Mastercard USD BSICards kreye.',
      card: virtualCard,
      raw: raw?.response ?? raw?.data ?? raw,
    };
  }
}
