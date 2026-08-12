import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class StrowalletService {
  private readonly logger = new Logger(StrowalletService.name);
  private readonly BASE_URL = 'https://strowallet.com/api/bitvcard';
  private readonly PUBLIC_KEY: string;
  private readonly MODE = 'live';

  // StroWallet konfime (10 out 2026, tès manyèl Olivier): AVS (Address
  // Verification System) machann (egzanp TEMU) egzije adrès bòdwo kat la
  // matche adrès REYÈL StroWallet la (Delaware) — "dépasse la limite de la
  // carte" te an reyalite yon echèk AVS, pa yon vrè limit tranzaksyon.
  // Sa aplike pou TOUT kat, PA adrès kliyan an — yon adrès Ayisyen reyèl
  // ta echwe AVS menm jan ak Miami fiktif la te fè.
  private readonly STROWALLET_BILLING_ADDRESS = {
    line1: '1007 N Orange St. 4th Floor',
    city: 'Wilmington',
    state: 'Delaware',
    postal_code: '19801',
    country: 'US',
  };

  // Fee constants
  private readonly CARD_CREATION_FEE_USD = 2.50;
  private readonly CARD_RECHARGE_FEE_FLAT_USD = 1.90;
  private readonly CARD_RECHARGE_FEE_PCT = 0.019;
  private readonly OZAMAPAY_RECHARGE_FEE_PCT = 0.02;
  private readonly MASTER_ID = process.env.OZAMAPAY_MASTER_ID as string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.PUBLIC_KEY = this.config.get<string>('STROWALLET_PUBLIC_KEY') ?? '';
  }

  // ─── HELPER ────────────────────────────────────────────────────────────────

  async getExchangeRate(): Promise<number> {
    const rate = await this.prisma.rate.findUnique({
      where: { key: 'CARD_RATE' },
    });
    if (!rate) throw new BadRequestException('Taux de change USD introuvable');
    return Number(rate.value);
  }

  private async nfcPost(endpoint: string, params: Record<string, string>) {
    const url = `${this.BASE_URL}/${endpoint}/`;
    const payload = { public_key: this.PUBLIC_KEY, mode: this.MODE, ...params };
    let data: any;
    try {
      ({ data } = await axios.post(url, null, { params: payload }));
    } catch (error: any) {
      const detail = error?.response?.data;
      this.logger.error(`Strowallet API error [${endpoint}]: ${JSON.stringify(detail) ?? error?.message}`);
      throw new BadRequestException('Nou rankontre yon pwoblèm teknik. Tanpri eseye ankò pita oswa kontakte sipò OZAMAPAY.');
    }
    if (data?.success === false || data?.status === false) {
      this.logger.error(`Strowallet error [${endpoint}]: ${JSON.stringify(data)}`);
      throw new BadRequestException('Nou rankontre yon pwoblèm teknik. Tanpri eseye ankò pita oswa kontakte sipò OZAMAPAY.');
    }
    return data;
  }

  // StroWallet konfime (2026-08-08): echèk "Using fake details" — adrès Miami
  // ak telefòn Ameriken fiktif nou te itilize a se rezon prensipal echèk
  // create-nfc-card yo. Rezoud vrè non/telefòn kliyan an pou payload StroWallet
  // — itilize pa createAndFundCard ak createReplacementCard pou yo rete koheran.
  private resolveNfcIdentity(user: {
    name: string | null;
    phone: string | null;
    kyc: { phoneNumber?: string | null } | null;
  }) {
    // last_name se dènye mo non konplè a, first_name se tout rès la ansanm
    const nameParts = (user.name || 'OZAMA USER').trim().split(/\s+/).filter(Boolean);
    const lastName = nameParts[nameParts.length - 1] || 'USER';
    const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : lastName;

    // Kyc.phoneNumber se vrè sous done a (kolekte pandan KYC, 93% ranpli);
    // User.phone se yon chan segondè ki ra ranpli (2.8%), sitou pou nimewo
    // etranje. Fòma entènasyonal san '+' StroWallet mande.
    const rawPhone = (user.kyc?.phoneNumber && user.kyc.phoneNumber.trim() !== '')
      ? user.kyc.phoneNumber
      : user.phone;
    if (!rawPhone) {
      throw new BadRequestException(
        'Ou dwe genyen yon nimewo telefòn valid nan pwofil ou pou kreye yon kat vityèl. Tanpri mete l ajou.'
      );
    }
    const digits = rawPhone.replace(/[^\d]/g, '');
    const phone = digits.length === 8 ? `509${digits}` : digits;

    return { firstName, lastName, phone };
  }

  private async nfcGet(endpoint: string, params: Record<string, string>) {
    const url = `${this.BASE_URL}/${endpoint}/`;
    const payload = { public_key: this.PUBLIC_KEY, mode: this.MODE, ...params };
    let data: any;
    try {
      ({ data } = await axios.get(url, { params: payload }));
    } catch (error: any) {
      this.logger.error(`Strowallet GET error [${endpoint}]: ${error?.message}`);
      throw new BadRequestException('Nou rankontre yon pwoblèm teknik. Tanpri eseye ankò pita oswa kontakte sipò OZAMAPAY.');
    }
    if (data?.success === false || data?.status === false) {
      this.logger.error(`Strowallet GET failed [${endpoint}]: ${JSON.stringify(data)}`);
      throw new BadRequestException('Nou rankontre yon pwoblèm teknik. Tanpri eseye ankò pita oswa kontakte sipò OZAMAPAY.');
    }
    return data;
  }

  // Yon itilizatè pa ta dwe janm gen 2 kat ki kalifye pou ACTIVE/FROZEN an
  // menm tan, men sa rive (egzanp: race condition doub-kreyasyon, 8 out) —
  // `findFirst` san orderBy sou yon enum PA garanti ki ranje l retounen,
  // kidonk yon kat FROZEN "fantom" ka parèt olye vrè kat ACTIVE la. Toujou
  // priyorize ACTIVE anvan FROZEN pou anpeche sa.
  private async findActiveOrFrozenCard(userId: string) {
    return (
      (await this.prisma.virtualCard.findFirst({ where: { userId, status: 'ACTIVE' } })) ??
      (await this.prisma.virtualCard.findFirst({ where: { userId, status: 'FROZEN' } }))
    );
  }

  // ─── HEALTH CHECK ────────────────────────────────────────────────────────────

  async checkHealth(): Promise<{ status: 'ok' | 'error'; message?: string }> {
    const url = `${this.BASE_URL}/fetch-nfccard-detail/`;
    try {
      await axios.get(url, {
        params: { public_key: this.PUBLIC_KEY, mode: this.MODE, card_id: 'health-check' },
        timeout: 10000,
      });
      return { status: 'ok' };
    } catch (error: any) {
      // Any HTTP response from Strowallet (even 4xx) means the API is reachable
      if (error?.response) return { status: 'ok' };
      this.logger.warn(`Strowallet health check failed: ${error?.message}`);
      return { status: 'error', message: 'Strowallet unreachable' };
    }
  }

  // ─── 1. CREATE NFC CARD (otomatik, pa bezwen compliance review) ─────────────

  async createAndFundCard(userId: string, amountUsd: number) {
    // Verifye pa gen kat ki poko rezoud — ACTIVE/FROZEN (kat ki egziste toujou) oswa
    // PENDING_RECHARGE (CardTerminationService ap toujou veye l, pa dwe gen 2 kreyasyon
    // pou menm kliyan an). TERMINATED/REPLACED san sa yo vle di lifecycle a fin rezoud,
    // OK pou kliyan an kreye yon nouvo kat li menm.
    const existing = await this.prisma.virtualCard.findFirst({
      where: { userId, status: { in: ['ACTIVE', 'FROZEN', 'PENDING_RECHARGE'] } },
    });
    if (existing) throw new BadRequestException('Ou genyen yon kat vityèl deja');

    // Jwenn done itilizatè
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true, kyc: true },
    });
    if (!user?.wallet) throw new NotFoundException('Wallet introuvable');
    if (!user.kyc || user.kyc.status !== 'APPROVED') {
      throw new BadRequestException('KYC ou dwe apwouve pou kreye yon kat');
    }

    // Kalkile total an HTG — frè $2.50 kreyasyon absòbe pa OZAMAPAY, pa itilizatè
    const exchangeRate = await this.getExchangeRate();
    const totalHtg = Math.ceil(amountUsd * exchangeRate);

    if (Number(user.wallet.balance) < totalHtg) {
      throw new BadRequestException(
        `Balans ennsifizan. Ou bezwen ${totalHtg} HTG (depò $${amountUsd})`
      );
    }

    const { firstName, lastName, phone } = this.resolveNfcIdentity(user);

    // Fòmate dat nesans KYC (mm/dd/yyyy)
    const dob = user.kyc.dateOfBirth
      ? new Date(user.kyc.dateOfBirth).toLocaleDateString('en-US', {
          month: '2-digit', day: '2-digit', year: 'numeric',
        })
      : '01/01/1990';

    const nfcParams = {
      name: user.name || 'OZAMA USER',
      first_name: firstName,
      last_name: lastName,
      dob,
      // StroWallet konfime (2026-08-07): pou kliyan Ayisyen, soumèt kat idantite
      // nasyonal la kòm si se te yon paspò — 'national_id' egzije yon fòma NIN
      // Nijeryen (11 chif) ki pa matche fòma Ayisyen an.
      id_type: 'passport',
      id_number: user.kyc.idNumber || '00000000',
      id_image: user.kyc.idImage,
      email: user.email,
      ...this.STROWALLET_BILLING_ADDRESS,
      amount_usd: String(amountUsd),
      phone,
      brand: 'Visa',
    };

    // ── Etap 1: Debi wallet sèlman (transaction 1) ──────────────────────────
    await this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { userId },
        data: { balance: { decrement: totalHtg } },
      });
    });

    // ── Etap 2: Apèl HTTP Strowallet DEYÒ transaction ────────────────────────
    let cardId: string;
    try {
      const cardResponse = await this.nfcPost('create-nfc-card', nfcParams);
      cardId = cardResponse?.response?.card_id || cardResponse?.data?.card_id || cardResponse?.card_id;
      if (!cardId) throw new BadRequestException('Strowallet pa retounen card_id');
    } catch (err) {
      // ── Etap 3: Strowallet echwe → renmbi wallet (NOUVO transaction) ────────
      await this.prisma.$transaction(async (tx) => {
        await tx.wallet.update({
          where: { userId },
          data: { balance: { increment: totalHtg } },
        });
        await tx.transaction.create({
          data: {
            senderWalletId: user.wallet!.id,
            type: 'CARD',
            amount: totalHtg,
            netAmount: totalHtg,
            fee: 0,
            status: 'FAILED',
            description: `Kreyasyon kat vityèl NFC $${amountUsd} ECHWE — renmbi otomatik fèt`,
            reference: `CARD-CREATE-FAIL-${Date.now()}`,
          },
        });
      });
      throw err;
    }

    // ── Etap 4: Strowallet siksè → kreye VirtualCard + Transaction (NOUVO transaction) ──
    const virtualCard = await this.prisma.$transaction(async (tx) => {
      const card = await tx.virtualCard.create({
        data: {
          userId,
          cardId,
          balance: amountUsd,
          currency: 'USD',
          provider: 'STROWALLET_NFC',
          status: 'ACTIVE',
        },
      });

      await tx.transaction.create({
        data: {
          senderWalletId: user.wallet!.id,
          type: 'CARD',
          amount: totalHtg,
          netAmount: totalHtg,
          fee: 0,
          status: 'COMPLETED',
          description: `Kreye kat vityèl NFC — $${amountUsd}`,
          reference: `CARD-CREATE-${cardId}`,
        },
      });

      return card;
    });

    return {
      message: 'Kat vityèl NFC kreye avèk siksè! Google Pay & Apple Pay aktive.',
      card: virtualCard,
    };
  }

  // ─── 1b. CREATE REPLACEMENT CARD (apre terminasyon, deja finanse) ───────────
  // Itilize pa CardTerminationService: pa gen verifikasyon "kat deja egziste",
  // ni debi wallet — lajan an soti nan pool StroWallet (balans ranbouse a).
  async createReplacementCard(userId: string, fundAmountUsd: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { kyc: true },
    });
    if (!user) throw new NotFoundException('Itilizatè introuvable');

    const { firstName, lastName, phone } = this.resolveNfcIdentity(user);

    const dob = user.kyc?.dateOfBirth
      ? new Date(user.kyc.dateOfBirth).toLocaleDateString('en-US', {
          month: '2-digit', day: '2-digit', year: 'numeric',
        })
      : '01/01/1990';

    const nfcParams = {
      name: user.name || 'OZAMA USER',
      first_name: firstName,
      last_name: lastName,
      dob,
      // StroWallet konfime (2026-08-07): pou kliyan Ayisyen, soumèt kat idantite
      // nasyonal la kòm si se te yon paspò — 'national_id' egzije yon fòma NIN
      // Nijeryen (11 chif) ki pa matche fòma Ayisyen an.
      id_type: 'passport',
      id_number: user.kyc?.idNumber || '00000000',
      id_image: user.kyc?.idImage || '',
      email: user.email,
      ...this.STROWALLET_BILLING_ADDRESS,
      amount_usd: String(fundAmountUsd),
      phone,
      brand: 'Visa',
    };

    const cardResponse = await this.nfcPost('create-nfc-card', nfcParams);
    const cardId = cardResponse?.response?.card_id || cardResponse?.data?.card_id || cardResponse?.card_id;
    if (!cardId) throw new BadRequestException('Strowallet pa retounen card_id pou kat ranplasman an');

    return this.prisma.virtualCard.create({
      data: {
        userId,
        cardId,
        balance: fundAmountUsd,
        currency: 'USD',
        provider: 'STROWALLET_NFC',
        status: 'ACTIVE',
      },
    });
  }

  // ─── 2. SECRET DETAILS (nimewo konplè, CVV, dat ekspirasyon) ────────────────

  async getCardSecretDetails(userId: string) {
    const virtualCard = await this.findActiveOrFrozenCard(userId);
    if (!virtualCard) throw new NotFoundException('Ou pa gen yon kat vityèl');

    const data = await this.nfcGet('fetch-nfccard-detail', { card_id: virtualCard.cardId });

    const detail = data?.response?.card_detail;
    return {
      cardNumberUrl: detail?.card_number_url,
      cvvUrl: detail?.cvv_url,
      expiryDate: detail?.expiry,
      cardName: detail?.card_holder_name,
      balance: detail?.balance,
      last4: detail?.last4,
    };
  }

  // ─── 3. FUND CARD (recharje) ─────────────────────────────────────────────────

  async fundVirtualCard(userId: string, amountUsd: number) {
    const card = await this.findActiveOrFrozenCard(userId);
    if (!card) throw new NotFoundException('Ou pa gen yon kat vityèl');
    if (card.status !== 'ACTIVE') throw new BadRequestException('Kat ou a pa aktif');

    const exchangeRate = await this.getExchangeRate();
    const serviceFeeUsd = this.CARD_RECHARGE_FEE_FLAT_USD + amountUsd * this.CARD_RECHARGE_FEE_PCT;
    const ozamapayFeeUsd = Math.round(amountUsd * this.OZAMAPAY_RECHARGE_FEE_PCT * 100) / 100;
    const totalUsd = amountUsd + serviceFeeUsd + ozamapayFeeUsd;
    const totalHtg = Math.ceil(totalUsd * exchangeRate);
    const ozamapayFeeHtg = Math.round(ozamapayFeeUsd * exchangeRate * 100) / 100;

    const wallet = await this.prisma.wallet.findFirst({ where: { userId } });
    if (!wallet || Number(wallet.balance) < totalHtg) {
      throw new BadRequestException(
        `Balans ennsifizan. Ou bezwen ${totalHtg} HTG (recharge $${amountUsd} + frè sèvis $${serviceFeeUsd.toFixed(2)} + OZAMAPAY $${ozamapayFeeUsd.toFixed(2)})`
      );
    }

    // ── Etap 1: Debi wallet sèlman (transaction 1) ──────────────────────────
    await this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { userId },
        data: { balance: { decrement: totalHtg } },
      });
    });

    // ── Etap 2: Apèl HTTP Strowallet DEYÒ transaction ────────────────────────
    try {
      await this.nfcPost('fund-withdraw-nfccard', {
        card_id: card.cardId,
        amount: String(amountUsd),
        type: 'fund',
      });
    } catch (err) {
      // ── Etap 3: Strowallet echwe → renmbi wallet (NOUVO transaction) ────────
      await this.prisma.$transaction(async (tx) => {
        await tx.wallet.update({
          where: { userId },
          data: { balance: { increment: totalHtg } },
        });
        await tx.transaction.create({
          data: {
            senderWalletId: wallet.id,
            type: 'CARD',
            amount: totalHtg,
            netAmount: Math.ceil(amountUsd * exchangeRate),
            fee: Math.round((serviceFeeUsd + ozamapayFeeUsd) * exchangeRate * 100) / 100,
            status: 'FAILED',
            description: `Recharge kat NFC $${amountUsd} ECHWE — renmbi otomatik fèt`,
            reference: `CARD-FUND-FAIL-${card.cardId}-${Date.now()}`,
          },
        });
      });
      throw err;
    }

    // ── Etap 4: Strowallet siksè → update VirtualCard balance (NOUVO transaction) ──
    await this.prisma.$transaction(async (tx) => {
      await tx.virtualCard.update({
        where: { cardId: card.cardId },
        data: { balance: { increment: amountUsd } },
      });
      await tx.wallet.update({
        where: { userId: this.MASTER_ID },
        data: { balance: { increment: ozamapayFeeHtg } },
      });
      await tx.transaction.create({
        data: {
          senderWalletId: wallet.id,
          type: 'CARD',
          amount: totalHtg,
          netAmount: Math.ceil(amountUsd * exchangeRate),
          fee: Math.round((serviceFeeUsd + ozamapayFeeUsd) * exchangeRate * 100) / 100,
          status: 'COMPLETED',
          description: `Recharge kat NFC $${amountUsd} + frè sèvis $${serviceFeeUsd.toFixed(2)} + OZAMAPAY $${ozamapayFeeUsd.toFixed(2)}`,
          reference: `CARD-FUND-${card.cardId}-${Date.now()}`,
        },
      });
    });

    return { message: `Kat recharje avèk siksè — $${amountUsd} ajoute` };
  }

  // ─── 3b. ADMIN: DIRECT CARD OPERATIONS (no wallet involvement) ──────────────
  // Thin passthroughs to the raw StroWallet endpoints, bypassing the HTG wallet
  // debit/fee logic in fundVirtualCard. For admin/one-off tooling only (e.g.
  // manual goodwill compensations funded by OZAMAPAY, not the customer) — never
  // call these from customer-facing routes.

  async fetchCardDetailByCardId(cardId: string) {
    return this.nfcGet('fetch-nfccard-detail', { card_id: cardId });
  }

  async fundCardDirect(cardId: string, amountUsd: number) {
    return this.nfcPost('fund-withdraw-nfccard', {
      card_id: cardId,
      amount: String(amountUsd),
      type: 'fund',
    });
  }

  // ─── 4. CARD HISTORY ─────────────────────────────────────────────────────────
  // Merged view of real StroWallet card activity (CardTransaction — populated by
  // webhook events) + wallet-side HTG movements (Transaction). Replaces the old
  // call to StroWallet's 'fetch-nfccard-history' endpoint, which no longer exists
  // (confirmed returning an HTML 404 page instead of JSON) — no reason to keep two
  // separate paths for what should be one history list.

  async getCardHistory(userId: string) {
    const [cardTransactions, walletTransactions] = await Promise.all([
      this.prisma.cardTransaction.findMany({
        where: { userId },
        orderBy: { occurredAt: 'desc' },
        take: 100,
      }),
      this.prisma.transaction.findMany({
        where: {
          OR: [{ senderWallet: { userId } }, { receiverWallet: { userId } }],
        },
        include: {
          senderWallet: { include: { user: { select: { name: true, email: true } } } },
          receiverWallet: { include: { user: { select: { name: true, email: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    const merged = [
      ...cardTransactions.map((ct) => ({
        source: 'CARD' as const,
        date: ct.occurredAt,
        id: ct.id,
        cardId: ct.cardId,
        reference: ct.reference,
        type: ct.type,
        amount: Number(ct.amount),
        currency: ct.currency,
        status: ct.status,
        merchant: ct.merchant,
        narrative: ct.narrative,
        mcc: ct.mcc,
        country: ct.country,
      })),
      ...walletTransactions.map((tx) => ({
        source: 'WALLET' as const,
        date: tx.createdAt,
        ...tx,
      })),
    ];

    merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return merged;
  }

  // ─── 5. LOCAL DATA (with live balance sync) ──────────────────────────────────

  async getMyCardLocalData(userId: string) {
    const card = await this.findActiveOrFrozenCard(userId);
    if (!card) return null;

    try {
      const data = await this.nfcGet('fetch-nfccard-detail', { card_id: card.cardId });
      const liveBalance = parseFloat(data?.response?.card_detail?.balance ?? data?.data?.balance);
      if (!isNaN(liveBalance)) {
        return await this.prisma.virtualCard.update({
          where: { cardId: card.cardId },
          data: { balance: liveBalance },
        });
      }
    } catch {
      // Fall back to cached balance if Strowallet is unavailable
    }

    return card;
  }

  // ─── 6. FREEZE / UNFREEZE ────────────────────────────────────────────────────

  async freezeCard(userId: string) {
    const card = await this.findActiveOrFrozenCard(userId);
    if (!card) throw new NotFoundException('Ou pa gen yon kat vityèl');

    await this.nfcGet('freezeactivate-nfc', {
      card_id: card.cardId,
      status: 'frozen',
    });

    await this.prisma.virtualCard.update({
      where: { cardId: card.cardId },
      data: { status: 'FROZEN' },
    });

    return { message: 'Kat bloké avèk siksè' };
  }

  async unfreezeCard(userId: string) {
    const card = await this.findActiveOrFrozenCard(userId);
    if (!card) throw new NotFoundException('Ou pa gen yon kat vityèl');

    await this.nfcGet('freezeactivate-nfc', {
      card_id: card.cardId,
      status: 'active',
    });

    await this.prisma.virtualCard.update({
      where: { cardId: card.cardId },
      data: { status: 'ACTIVE' },
    });

    return { message: 'Kat reatktive avèk siksè' };
  }
}
