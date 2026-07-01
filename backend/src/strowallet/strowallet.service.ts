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

  private async getExchangeRate(): Promise<number> {
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
    // Verifye pa gen kat deja
    const existing = await this.prisma.virtualCard.findUnique({ where: { userId } });
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

    // Parse non itilizatè
    const nameParts = (user.name || 'OZAMA USER').trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || 'USER';

    // Fòmate dat nesans KYC (mm/dd/yyyy)
    const dob = user.kyc.dateOfBirth
      ? new Date(user.kyc.dateOfBirth).toLocaleDateString('en-US', {
          month: '2-digit', day: '2-digit', year: 'numeric',
        })
      : '01/01/1990';

    // Debi wallet + kreye kat nan DB atomikman — nfcPost andedan transaction pou rollback si echèk
    const nfcParams = {
      name: user.name || 'OZAMA USER',
      first_name: firstName,
      last_name: lastName,
      dob,
      id_type: 'national_id',
      id_number: user.kyc.idNumber || '00000000',
      email: user.email,
      line1: '3401 N. Miami Ave, Ste 230',
      city: 'Miami',
      state: 'FL',
      postal_code: '33127',
      country: 'USA',
      amount_usd: String(amountUsd),
      phone: (user.phone && !user.phone.startsWith('509') && !user.phone.startsWith('+509'))
        ? user.phone
        : '3055550100',
    };

    const virtualCard = await this.prisma.$transaction(async (tx) => {
      // 1. Debi wallet anvan tout — si nfcPost echwe, rollback otomatik
      await tx.wallet.update({
        where: { userId },
        data: { balance: { decrement: totalHtg } },
      });

      // 2. Kreye kat NFC (si sa echwe, DB rollback fèt)
      const cardResponse = await this.nfcPost('create-nfc-card', nfcParams);
      const cardId = cardResponse?.response?.card_id || cardResponse?.data?.card_id || cardResponse?.card_id;
      if (!cardId) throw new BadRequestException('Strowallet pa retounen card_id');

      // 3. Sove kat nan DB
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

      // 4. Anrejistre tranzaksyon
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

  // ─── 2. SECRET DETAILS (nimewo konplè, CVV, dat ekspirasyon) ────────────────

  async getCardSecretDetails(userId: string) {
    const virtualCard = await this.prisma.virtualCard.findUnique({ where: { userId } });
    if (!virtualCard) throw new NotFoundException('Ou pa gen yon kat vityèl');

    const data = await this.nfcGet('fetch-nfccard-detail', { card_id: virtualCard.cardId });

    const detail = data?.response?.card_detail;
    return {
      cardNumber: detail?.card_number,
      cvv: detail?.cvv,
      expiryDate: detail?.expiry,
      cardName: detail?.card_holder_name,
      balance: detail?.balance,
      last4: detail?.last4,
    };
  }

  // ─── 3. FUND CARD (recharje) ─────────────────────────────────────────────────

  async fundVirtualCard(userId: string, amountUsd: number) {
    const card = await this.prisma.virtualCard.findUnique({ where: { userId } });
    if (!card) throw new NotFoundException('Ou pa gen yon kat vityèl');
    if (card.status !== 'ACTIVE') throw new BadRequestException('Kat ou a pa aktif');

    const exchangeRate = await this.getExchangeRate();
    const serviceFeeUsd = this.CARD_RECHARGE_FEE_FLAT_USD + amountUsd * this.CARD_RECHARGE_FEE_PCT;
    const ozamapayFeeUsd = Math.round(amountUsd * this.OZAMAPAY_RECHARGE_FEE_PCT * 100) / 100;
    const totalUsd = amountUsd + serviceFeeUsd + ozamapayFeeUsd;
    const totalHtg = Math.ceil(totalUsd * exchangeRate);
    const ozamapayFeeHtg = Math.round(ozamapayFeeUsd * exchangeRate * 100) / 100;

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
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
        where: { userId },
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

  // ─── 4. CARD HISTORY ─────────────────────────────────────────────────────────

  async getCardHistory(userId: string) {
    const card = await this.prisma.virtualCard.findUnique({ where: { userId } });
    if (!card) return [];

    const data = await this.nfcGet('fetch-nfccard-history', { card_id: card.cardId });
    return data?.data || data?.history || [];
  }

  // ─── 5. LOCAL DATA (with live balance sync) ──────────────────────────────────

  async getMyCardLocalData(userId: string) {
    const card = await this.prisma.virtualCard.findUnique({ where: { userId } });
    if (!card) return null;

    try {
      const data = await this.nfcGet('fetch-nfccard-detail', { card_id: card.cardId });
      const liveBalance = parseFloat(data?.response?.card_detail?.balance ?? data?.data?.balance);
      if (!isNaN(liveBalance)) {
        return await this.prisma.virtualCard.update({
          where: { userId },
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
    const card = await this.prisma.virtualCard.findUnique({ where: { userId } });
    if (!card) throw new NotFoundException('Ou pa gen yon kat vityèl');

    await this.nfcGet('freezeactivate-nfc', {
      card_id: card.cardId,
      status: 'frozen',
    });

    await this.prisma.virtualCard.update({
      where: { userId },
      data: { status: 'FROZEN' },
    });

    return { message: 'Kat bloké avèk siksè' };
  }

  async unfreezeCard(userId: string) {
    const card = await this.prisma.virtualCard.findUnique({ where: { userId } });
    if (!card) throw new NotFoundException('Ou pa gen yon kat vityèl');

    await this.nfcGet('freezeactivate-nfc', {
      card_id: card.cardId,
      status: 'active',
    });

    await this.prisma.virtualCard.update({
      where: { userId },
      data: { status: 'ACTIVE' },
    });

    return { message: 'Kat reatktive avèk siksè' };
  }
}
