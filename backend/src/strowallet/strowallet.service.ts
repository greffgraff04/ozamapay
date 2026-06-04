import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class StrowalletService {
  private readonly BASE_URL = 'https://strowallet.com/api/bitvcard';
  private readonly PUBLIC_KEY: string;
  private readonly MODE = 'live';

  // Fee constants
  private readonly CARD_CREATION_FEE_USD = 2.50;
  private readonly CARD_RECHARGE_FEE_FLAT_USD = 1.90;
  private readonly CARD_RECHARGE_FEE_PCT = 0.019;

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
      console.error('Strowallet API error:', error?.response?.data || error?.message || error);
      throw error;
    }
    if (data?.success === false || data?.status === false) {
      throw new BadRequestException(data?.message || 'Strowallet error');
    }
    console.log('Strowallet full response:', JSON.stringify(data, null, 2));
    return data;
  }

  private async nfcGet(endpoint: string, params: Record<string, string>) {
    const url = `${this.BASE_URL}/${endpoint}/`;
    const payload = { public_key: this.PUBLIC_KEY, mode: this.MODE, ...params };
    const { data } = await axios.get(url, { params: payload });
    if (data?.success === false || data?.status === false) {
      throw new BadRequestException(data?.message || 'Strowallet error');
    }
    return data;
  }

  // ─── 1. CREATE NFC CARD (otomatik, pa bezwen compliance review) ─────────────

  async createAndFundCard(userId: string, amountUsd: number) {
    console.log('createAndFundCard called for userId:', userId, 'amount:', amountUsd);
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

    // Kalkile total an HTG
    const exchangeRate = await this.getExchangeRate();
    const totalUsd = amountUsd + this.CARD_CREATION_FEE_USD;
    const totalHtg = Math.ceil(totalUsd * exchangeRate);

    if (Number(user.wallet.balance) < totalHtg) {
      throw new BadRequestException(
        `Balans ennsifizan. Ou bezwen ${totalHtg} HTG (depò $${amountUsd} + frè $${this.CARD_CREATION_FEE_USD})`
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

    // Kreye kat NFC otomatikman (1 sèl etap)
    console.log('Calling Strowallet NFC API with params:', { name: user.name, firstName, lastName, dob, email: user.email, country: 'HTI' });
    const cardResponse = await this.nfcPost('create-nfc-card', {
      name: user.name || 'OZAMA USER',
      first_name: firstName,
      last_name: lastName,
      dob,
      id_type: 'national_id',
      id_number: user.kyc.idNumber || '00000000',
      email: user.email,
      line1: user.kyc.line1 || 'Jacmel',
      city: user.kyc.city || 'Jacmel',
      state: user.kyc.state || 'Sud-Est',
      postal_code: '00000',
      country: 'HTI',
      amount_usd: String(amountUsd),
      phone: user.phone || '50936401900',
    });

    const cardId = cardResponse?.response?.card_id || cardResponse?.data?.card_id || cardResponse?.card_id;
    if (!cardId) throw new BadRequestException('Strowallet pa retounen card_id');

    // Debi wallet + kreye kat nan DB (transaksyon atomik)
    const [, virtualCard] = await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { userId },
        data: { balance: { decrement: totalHtg } },
      }),
      this.prisma.virtualCard.create({
        data: {
          userId,
          cardId,
          balance: amountUsd,
          currency: 'USD',
          provider: 'STROWALLET_NFC',
          status: 'ACTIVE',
        },
      }),
      this.prisma.transaction.create({
        data: {
          senderWalletId: user.wallet.id,
          type: 'CARD',
          amount: totalHtg,
          netAmount: totalHtg,
          fee: 0,
          status: 'COMPLETED',
          description: `Kreye kat vityèl NFC — $${amountUsd} + frè $${this.CARD_CREATION_FEE_USD}`,
          reference: `CARD-CREATE-${cardId}`,
        },
      }),
    ]);

    return {
      message: 'Kat vityèl NFC kreye avèk siksè! Google Pay & Apple Pay aktive.',
      card: virtualCard,
    };
  }

  // ─── 2. SECRET DETAILS (nimewo konplè, CVV, dat ekspirasyon) ────────────────

  async getCardSecretDetails(userId: string) {
    const card = await this.prisma.virtualCard.findUnique({ where: { userId } });
    if (!card) throw new NotFoundException('Ou pa gen yon kat vityèl');

    const data = await this.nfcGet('fetch-nfccard-detail', { card_id: card.cardId });
    console.log('Strowallet secret details response:', JSON.stringify(data, null, 2));

    return {
      cardNumber: data?.data?.card_number || data?.card_number,
      cvv: data?.data?.cvv || data?.cvv,
      expiryDate: data?.data?.expiry_date || data?.expiry_date,
      cardName: data?.data?.name_on_card || data?.name_on_card,
      balance: data?.data?.balance || data?.balance,
    };
  }

  // ─── 3. FUND CARD (recharje) ─────────────────────────────────────────────────

  async fundVirtualCard(userId: string, amountUsd: number) {
    const card = await this.prisma.virtualCard.findUnique({ where: { userId } });
    if (!card) throw new NotFoundException('Ou pa gen yon kat vityèl');
    if (card.status !== 'ACTIVE') throw new BadRequestException('Kat ou a pa aktif');

    const exchangeRate = await this.getExchangeRate();
    const feeUsd = this.CARD_RECHARGE_FEE_FLAT_USD + amountUsd * this.CARD_RECHARGE_FEE_PCT;
    const totalUsd = amountUsd + feeUsd;
    const totalHtg = Math.ceil(totalUsd * exchangeRate);

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet || Number(wallet.balance) < totalHtg) {
      throw new BadRequestException(
        `Balans ennsifizan. Ou bezwen ${totalHtg} HTG (recharge $${amountUsd} + frè $${feeUsd.toFixed(2)})`
      );
    }

    // Debi HTG wallet + recharje kat (transaksyon atomik — si Strowallet echwe, debi pa pase)
    await this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { userId },
        data: { balance: { decrement: totalHtg } },
      });

      // Apèl Strowallet NFC fund
      await this.nfcPost('fund-withdraw-nfccard', {
        card_id: card.cardId,
        amount: String(amountUsd),
        type: 'fund',
      });

      await tx.virtualCard.update({
        where: { userId },
        data: { balance: { increment: amountUsd } },
      });

      await tx.transaction.create({
        data: {
          senderWalletId: wallet.id,
          type: 'CARD',
          amount: totalHtg,
          netAmount: totalHtg,
          fee: Math.round(feeUsd * exchangeRate * 100) / 100,
          status: 'COMPLETED',
          description: `Recharge kat NFC $${amountUsd} + frè $${feeUsd.toFixed(2)}`,
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

  // ─── 5. LOCAL DATA ────────────────────────────────────────────────────────────

  async getMyCardLocalData(userId: string) {
    const card = await this.prisma.virtualCard.findUnique({ where: { userId } });
    if (!card) return null;
    return card;
  }

  // ─── 6. FREEZE / UNFREEZE ────────────────────────────────────────────────────

  async freezeCard(userId: string) {
    const card = await this.prisma.virtualCard.findUnique({ where: { userId } });
    if (!card) throw new NotFoundException('Ou pa gen yon kat vityèl');

    await this.nfcPost('freezeactivate-nfc', {
      card_id: card.cardId,
      action: 'freeze',
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

    await this.nfcPost('freezeactivate-nfc', {
      card_id: card.cardId,
      action: 'activate',
    });

    await this.prisma.virtualCard.update({
      where: { userId },
      data: { status: 'ACTIVE' },
    });

    return { message: 'Kat reatktive avèk siksè' };
  }
}
