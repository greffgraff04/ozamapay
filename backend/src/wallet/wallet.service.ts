import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import { Prisma, TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TrackingService } from '../tracking/tracking.service';
import { KycService } from '../kyc/kyc.service';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';


const FEES = {
  TOPUP: 0.06,
  TRANSFER: 0.0099,
  WITHDRAW: 0.02,
  // L7 — frè konvèsyon devise. Apwouve pa Greffin 2026-10-24 (1%, aliye ak
  // TRANSFER=0.99%).
  CONVERT: 0.01,
};

const MASTER_ID = process.env.OZAMAPAY_MASTER_ID as string;

const INTERNATIONAL_METHODS = ['ZELLE', 'CASHAPP', 'MERU', 'BANK', 'USDT'];
const isInternational = (method: string) => INTERNATIONAL_METHODS.includes(method.toUpperCase());

const DOMESTIC_TOPUP_METHODS = ['MONCASH', 'NATCASH'];
const INTL_DEPOSIT_METHODS = ['BANK', 'ZELLE', 'CASHAPP', 'MERU', 'USDT'];

// L7 — devise sipòte pou /wallet/convert. Kle Rate korespondan an (HTG per
// 1 inite) — null pou HTG limenm (idantite, pa gen lòt to pou chèche).
const CONVERT_RATE_KEYS: Record<string, string | null> = {
  HTG: null,
  USD: 'USD_HTG',
  EUR: 'EUR_HTG',
};

// Gad-fou sanite (pa yon règ biznis strik, menm filozofi ak
// WALLET_TRANSFER_MAX_HTG) — aplike sou valè EKIVALAN an HTG, kèlkeswa
// devise sous/destinasyon an.
const CONVERT_MAX_HTG_EQUIVALENT = 500_000;

@Injectable()
export class WalletService {
  constructor(
    private prisma: PrismaService,
    private trackingService: TrackingService,
    private kycService: KycService,
  ) {}

  // ======================================================
  // HELPERS
  // ======================================================

  private round(value: number) {
    return Math.round(value * 100) / 100;
  }

  // L7 — yon round-trip HTG->USD->HTG ak Math.round "nòmal" te ka rann PI
  // PLIS pase montan depa a (ekzanp konkrè: 1000 HTG te vin 1000.35 HTG),
  // sa ki ta pèmèt yon arbitraj enfini (konvèti fè-wi-ale san rete). Règ
  // absoli: montan KREDITE a toujou wondi AN BA (floorCents), montan FRÈ a
  // toujou wondi AN WO (ceilCents) — platfòm lan pa janm pèdi yon santim,
  // kliyan an pa janm genyen yon santim ki pa t gen rezon egziste.
  private floorCents(value: number) {
    return Math.floor(value * 100) / 100;
  }

  private ceilCents(value: number) {
    return Math.ceil(value * 100) / 100;
  }

  private async getUsdHtgRate(): Promise<number> {
    const entry = await this.prisma.rate.findUnique({ where: { key: 'USD_HTG' } });
    return Number(entry?.value || 140);
  }

  // L7 — kontrèman ak getUsdHtgRate() pi wo a (fallback 140 silansye), isit
  // la nou REJTE si to a manke/envalid — "refuse proprement" olye konvèti
  // ak yon to ki pa vrè. Sèlman itilize pa /wallet/convert.
  private async getStrictHtgRate(currency: string): Promise<number> {
    if (currency === 'HTG') return 1;
    const key = CONVERT_RATE_KEYS[currency];
    if (!key) {
      throw new BadRequestException(`Devise ${currency} pa sipòte pou konvèsyon`);
    }
    const entry = await this.prisma.rate.findUnique({ where: { key } });
    const n = Number(entry?.value);
    if (!entry || !Number.isFinite(n) || n <= 0) {
      throw new BadRequestException(
        `Konvèsyon ${currency} pa disponib kounye a — to chanj pa konfigire`,
      );
    }
    return n;
  }

  // Konvèti yon montan nan `from` pou jwenn valè an `to`, pase pa HTG kòm
  // pivo (menm jan ak tout lòt konvèsyon nan platfòm lan — wè
  // BSICardsMastercardEuroService.getEurHtgRate). Retounen tou valè
  // ekivalan an HTG pou kontwòl plafon.
  private async convertViaHtg(
    amount: number,
    from: string,
    to: string,
  ): Promise<{ htgEquivalent: number; grossTo: number }> {
    const fromRate = await this.getStrictHtgRate(from);
    const toRate = await this.getStrictHtgRate(to);
    const htgEquivalent = from === 'HTG' ? amount : amount * fromRate;
    const grossTo = to === 'HTG' ? htgEquivalent : htgEquivalent / toRate;
    return { htgEquivalent, grossTo };
  }

  // ======================================================
  // WALLET
  // ======================================================

  async getWallet(userId: string) {
    const wallet =
      await this.prisma.wallet.findUnique({
        where: {
          userId,
        },
      });

    if (!wallet) {
      throw new NotFoundException(
        'Wallet pa jwenn',
      );
    }

    return wallet;
  }

  // ======================================================
  // TRANSACTIONS
  // ======================================================

  async getTransactions(
    userId: string,
    limit = 5,
    offset = 0,
    type?: string,
  ): Promise<{ data: any[]; total: number; hasMore: boolean }> {
    const where: Prisma.TransactionWhereInput = {
      AND: [
        { OR: [{ senderWallet: { userId } }, { receiverWallet: { userId } }] },
        ...(type ? [{ type: type as TransactionType }] : []),
      ],
    };

    const rows = await this.prisma.transaction.findMany({
      where,
      include: {
        senderWallet: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
        receiverWallet: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
        commissions: {
          take: 1,
          include: {
            agent: {
              include: {
                user: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await this.prisma.transaction.count({ where });

    const data = rows.map(({ commissions, ...tx }) => ({
      ...tx,
      agentFirstName: commissions[0]?.agent?.user?.name?.split(' ')[0] ?? null,
    }));

    return { data, total, hasMore: offset + limit < total };
  }

  // ======================================================
  // P2P TRANSFER (SEKIRIZE AVÈK PIN & 0% FRAIS)
  // ======================================================

  async transferP2P(
    senderId: string,
    recipientEmail: string,
    amount: number,
    pin: string, // 🔑 NOUVO: Nou mande PIN itilizatè a kounye a
  ) {
    // 1. Verifye si moun k ap voye a gen KYC approved
    await this.kycService.assertApproved(senderId);

    // 2. 🚨 BARYÈ SEKIRITE: Verifye si Kòd PIN lan koresponn ak sa ki nan DB a
    const sender = await this.prisma.user.findUnique({ where: { id: senderId } });
    if (!sender) {
      throw new NotFoundException('Itilizatè sa a pa egziste.');
    }
    const pinValid = sender.transactionPin && await bcrypt.compare(pin, sender.transactionPin);
    if (!pinValid) {
      throw new BadRequestException('Kòd PIN sekirite a enkòrèk. Tranzaksyon bloke!');
    }

    const transferAmount = Number(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      throw new BadRequestException('Montan invalid');
    }

    // 3. Jwenn bous moun k ap voye a
    const senderWallet = await this.prisma.wallet.findUnique({
      where: { userId: senderId },
    });

    if (!senderWallet) {
      throw new NotFoundException('Wallet sender pa jwenn');
    }

    // 5. Jwenn moun k ap resevwa a pa imèl li
    const recipient = await this.prisma.user.findUnique({
      where: { email: recipientEmail.toLowerCase().trim() },
      include: { wallet: true },
    });

    if (!recipient || !recipient.wallet) {
      throw new NotFoundException('Destinatè pa jwenn');
    }

    if (recipient.id === senderId) {
      throw new BadRequestException('Ou pa ka voye kòb bay tèt ou');
    }

    // 6. Kouri tranzaksyon an nan Prisma ($transaction)
    return this.prisma.$transaction(async (tx) => {
      const currentWallet = await tx.wallet.findUnique({ where: { userId: senderId } });
      if (!currentWallet || Number(currentWallet.balance) < transferAmount) {
        throw new BadRequestException('Balans ensifizan');
      }

      const recentDuplicate = await tx.transaction.findFirst({
        where: {
          senderWalletId: senderWallet.id,
          receiverWalletId: recipient.wallet!.id,
          amount: transferAmount,
          status: 'COMPLETED',
          createdAt: { gte: new Date(Date.now() - 30000) },
        },
      });
      if (recentDuplicate) {
        throw new BadRequestException('Tranzaksyon sa deja soumèt. Tann 30 segonn.');
      }

      await tx.wallet.update({
        where: { userId: senderId },
        data: {
          balance: { decrement: transferAmount },
        },
      });

      await tx.wallet.update({
        where: { userId: recipient.id },
        data: {
          balance: { increment: transferAmount },
        },
      });

      const reference = `P2P-${uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase()}`;

      const transaction = await tx.transaction.create({
        data: {
          reference,
          senderWalletId: senderWallet.id,
          receiverWalletId: recipient.wallet?.id,
          amount: transferAmount,
          fee: 0,
          netAmount: transferAmount,
          type: 'TRANSFER',
          status: 'COMPLETED',
          method: 'OZAMAPAY',
          title: `Ou voye ${transferAmount} HTG bay ${recipient.name || recipient.email}`,
          description: `${sender.name || sender.email} voye ${transferAmount} HTG pou ou`,
        },
      });

      return {
        message: 'Transfer P2P reyisi',
        transaction,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  // ======================================================
  // TRANSFER (SEKIRIZE AVÈK PIN & WITH FEES)
  // ======================================================

  async transfer(
    senderId: string,
    recipientEmail: string,
    amount: number,
    pin: string, // 🔑 NOUVO: Nou mande PIN itilizatè a kounye a tou
  ) {
    await this.kycService.assertApproved(senderId);

    // 🚨 BARYÈ SEKIRITE: Verifye si Kòd PIN lan koresponn ak sa ki nan DB a
    const sender = await this.prisma.user.findUnique({ where: { id: senderId } });
    if (!sender) {
      throw new NotFoundException('Itilizatè sa a pa egziste.');
    }
    const pinValid2 = sender.transactionPin && await bcrypt.compare(pin, sender.transactionPin);
    if (!pinValid2) {
      throw new BadRequestException('Kòd PIN sekirite a enkòrèk. Tranzaksyon bloke!');
    }

    const cleanAmount = Number(amount);
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      throw new BadRequestException('Montan invalid');
    }

    const senderWallet = await this.prisma.wallet.findUnique({
      where: { userId: senderId },
    });

    if (!senderWallet) {
      throw new NotFoundException('Wallet sender pa jwenn');
    }

    const recipient = await this.prisma.user.findUnique({
      where: {
        email: recipientEmail.toLowerCase().trim(),
      },
      include: {
        wallet: true,
      },
    });

    if (!recipient || !recipient.wallet) {
      throw new NotFoundException('Destinatè pa jwenn');
    }

    if (recipient.id === senderId) {
      throw new BadRequestException('Ou pa ka voye kòb bay tèt ou');
    }

    const fee = 0;
    const totalDebit = this.round(cleanAmount + fee);

    let masterWallet = await this.prisma.wallet.findUnique({
      where: { userId: MASTER_ID },
    });

    if (!masterWallet) {
      masterWallet = await this.prisma.wallet.create({
        data: {
          userId: MASTER_ID,
          balance: 0,
        },
      });
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const currentWallet = await tx.wallet.findUnique({ where: { userId: senderId } });
      if (!currentWallet || Number(currentWallet.balance) < totalDebit) {
        throw new BadRequestException('Balans ensifizan');
      }

      const recentDuplicate = await tx.transaction.findFirst({
        where: {
          senderWalletId: senderWallet.id,
          receiverWalletId: recipient.wallet!.id,
          amount: cleanAmount,
          status: 'COMPLETED',
          createdAt: { gte: new Date(Date.now() - 30000) },
        },
      });
      if (recentDuplicate) {
        throw new BadRequestException('Tranzaksyon sa deja soumèt. Tann 30 segonn.');
      }

      await tx.wallet.update({
        where: { userId: senderId },
        data: {
          balance: { decrement: totalDebit },
        },
      });

      await tx.wallet.update({
        where: { userId: recipient.id },
        data: {
          balance: { increment: cleanAmount },
        },
      });

      await tx.wallet.update({
        where: { userId: MASTER_ID },
        data: {
          balance: { increment: fee },
        },
      });

      const reference = `TRX-${uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase()}`;

      const transaction = await tx.transaction.create({
        data: {
          reference,
          senderWalletId: senderWallet.id,
          receiverWalletId: recipient.wallet!.id,
          amount: cleanAmount,
          fee,
          netAmount: cleanAmount,
          type: 'TRANSFER',
          status: 'COMPLETED',
          method: 'OZAMAPAY',
          title: `Ou voye ${cleanAmount} HTG bay ${recipient.name || recipient.email}`,
          description: `${sender.name || sender.email} voye ${cleanAmount} HTG pou ou`,
        },
      });

      return {
        message: 'Transfer reyisi',
        transaction,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    this.trackingService.pushRecentTransfer({
      reference: result.transaction.reference,
      amount: Number(result.transaction.amount),
      senderLabel: this.trackingService.maskName(sender.name),
      receiverLabel: this.trackingService.maskName(recipient.name),
      createdAt: Date.now(),
    });

    return result;
  }

  // ======================================================
  // MANUAL TOPUP
  // ======================================================

  async createManualTopup(
    userId: string,
    amount: number,
    method: string,
    agentId?: string,
    proofImage?: string,
  ) {
    const methodUpper = method.toUpperCase();
    if (DOMESTIC_TOPUP_METHODS.includes(methodUpper)) {
      if (!Number.isFinite(amount) || amount < 50 || amount > 30000) {
        throw new BadRequestException('Montan depo dwe ant 50 ak 30,000 HTG');
      }
    } else if (INTL_DEPOSIT_METHODS.includes(methodUpper)) {
      if (!Number.isFinite(amount) || amount < 10 || amount > 1000) {
        throw new BadRequestException('Montan depo dwe ant $10 ak $1,000 USD');
      }
    }

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet pa jwenn');

    const amountHTG = isInternational(method)
      ? this.round(amount * await this.getUsdHtgRate())
      : amount;

    const fee = this.round(amountHTG * FEES.TOPUP);
    // Fee is on top — user receives the full HTG equivalent
    const reference = `TOPUP-${uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase()}`;

    const netAmount = this.round(amountHTG - fee);

    return this.prisma.transaction.create({
      data: {
        reference,
        receiverWalletId: wallet.id,
        amount: amountHTG,
        fee,
        netAmount,
        type: 'TOPUP',
        status: 'PENDING',
        method,
        title: isInternational(method)
          ? `Depot via ${method} — $${amount} USD (${amountHTG} HTG)`
          : `Depot via ${method} — ${amountHTG} HTG`,
        ...(proofImage ? { proofImage } : {}),
      },
    });
  }

  // ======================================================
  // APPROVE TOPUP
  // ======================================================

  async approveTopup(transactionId: string, userId: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction pa jwenn');
    }

    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet pa jwenn');
    }

    const fee = this.round(Number(transaction.amount) * FEES.TOPUP);
    const netAmount = this.round(Number(transaction.amount) - fee);

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.transaction.findUnique({ where: { id: transaction.id } });
      if (!existing || existing.status !== 'PENDING') {
        throw new BadRequestException('Tranzaksyon sa a trete deja');
      }

      await tx.wallet.update({
        where: { userId },
        data: { balance: { increment: netAmount } },
      });

      await tx.wallet.update({
        where: { userId: MASTER_ID },
        data: { balance: { increment: fee } },
      });

      const updated = await tx.transaction.update({
        where: { id: transaction.id },
        data: { status: 'COMPLETED' },
      });

      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  // ======================================================
  // REJECT TOPUP
  // ======================================================

  async rejectTopup(transactionId: string) {
    return this.prisma.transaction.update({
      where: { id: transactionId },
      data: { status: 'REJECTED' },
    });
  }

  // ======================================================
  // WITHDRAW
  // ======================================================

  async createWithdrawRequest(
    userId: string,
    amount: number,
    method: string,
    accountInfo: string,
  ) {
    await this.kycService.assertApproved(userId);

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet pa jwenn');

    const amountHTG = isInternational(method)
      ? this.round(amount * await this.getUsdHtgRate())
      : amount;

    if (!Number.isFinite(amountHTG) || amountHTG < 50 || amountHTG > 10000) {
      throw new BadRequestException('Montan retrè dwe ant 50 ak 10,000 HTG');
    }

    const fee = this.round(amountHTG * FEES.WITHDRAW);
    const totalDebit = this.round(amountHTG + fee);

    const reference = `WD-${uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase()}`;

    return this.prisma.$transaction(async (tx) => {
      const currentWallet = await tx.wallet.findUnique({ where: { userId } });
      if (!currentWallet || Number(currentWallet.balance) < totalDebit) {
        throw new BadRequestException('Balans ensifizan');
      }

      await tx.wallet.update({
        where: { userId },
        data: { balance: { decrement: totalDebit } },
      });

      return tx.transaction.create({
        data: {
          reference,
          senderWalletId: wallet.id,
          amount: amountHTG,
          fee,
          netAmount: amountHTG,
          type: 'WITHDRAWAL',
          status: 'PENDING',
          method,
          description: accountInfo,
          title: isInternational(method)
            ? `Retrè via ${method} — $${amount} USD (${amountHTG} HTG)`
            : `Retrè via ${method} — ${amountHTG} HTG`,
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  // ======================================================
  // SERVICE REQUEST
  // ======================================================

  async createFinanceRequest(
    userId: string,
    serviceType: any,
    amount: number,
    details: string,
    proofImage?: string,
  ) {
    // Wise was retired as a service option — reject new requests even if
    // called directly (the UI no longer offers it, but nothing else here
    // validated serviceType against the enum before this). Existing WISE
    // ServiceRequest rows are untouched and still processed normally by
    // admin — this only blocks *new* ones.
    if (serviceType === 'WISE') {
      throw new BadRequestException('Sèvis sa a pa disponib ankò');
    }

    await this.kycService.assertApproved(userId);
    // HTG services get 2% fee, USD/USDT services get 6% fee
    const isHtgService = serviceType === 'NATCASH';
    const feeRate = isHtgService ? FEES.WITHDRAW : FEES.TOPUP;
    const fee = amount * feeRate;

    return this.prisma.serviceRequest.create({
      data: {
        userId,
        serviceType,
        amount,
        fee,
        details,
        proofImage: proofImage ?? null,
        status: 'PENDING',
      },
    });
  }

  // ======================================================
  // ADMIN TOPUP
  // ======================================================

  async adminTopup(userId: string, amount: number) {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet pa jwenn');
      }

      const updated = await tx.wallet.update({
        where: { userId },
        data: { balance: { increment: amount } },
      });

      await tx.transaction.create({
        data: {
          reference: `ADMIN-${uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase()}`,
          receiverWalletId: wallet.id,
          amount,
          fee: 0,
          netAmount: amount,
          type: 'TOPUP',
          status: 'COMPLETED',
          method: 'ADMIN',
          title: 'Admin Topup',
        },
      });

      return updated;
    });
  }

  // ======================================================
  // STATS
  // ======================================================

  async getStats() {
    const users = await this.prisma.user.count();
    const transactions = await this.prisma.transaction.count();
    const pending = await this.prisma.transaction.count({
      where: { status: 'PENDING' },
    });
    const volume = await this.prisma.transaction.aggregate({
      _sum: { amount: true },
    });

    return {
      users,
      transactions,
      pending,
      volume: volume._sum.amount || 0,
    };
  }

  async getNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async markNotificationsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  }

  // ======================================================
  // L7 — CONVERSION DE DEVISES (HTG <-> USD <-> EUR)
  // ======================================================

  async getConversionQuote(userId: string, from: string, to: string, amount: unknown) {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      throw new BadRequestException('Montan envalid — dwe yon nonb pozitif');
    }
    if (from === to) {
      throw new BadRequestException('Pa ka konvèti yon devise an tèt li');
    }

    const { htgEquivalent, grossTo } = await this.convertViaHtg(n, from, to);

    if (htgEquivalent > CONVERT_MAX_HTG_EQUIVALENT) {
      throw new BadRequestException(
        `Montan depase plafon maksimòm (${CONVERT_MAX_HTG_EQUIVALENT} HTG ekivalan)`,
      );
    }

    const feePercent = FEES.CONVERT;
    // Frè wondi AN WO (janm anba sa 1% reyèl la), montan kredite wondi AN
    // BA (janm pi plis pase sa kliyan an merite) — wè floorCents/ceilCents.
    const feeAmount = this.ceilCents(grossTo * feePercent);
    const finalAmount = this.floorCents(grossTo - feeAmount);
    const rate = n > 0 ? grossTo / n : 0;

    if (!Number.isFinite(finalAmount) || finalAmount <= 0) {
      throw new BadRequestException('Montan final la envalid apre konvèsyon — eseye yon montan diferan');
    }

    const expiresAt = new Date(Date.now() + 30_000);

    const quote = await this.prisma.conversionQuote.create({
      data: {
        userId,
        fromCurrency: from,
        toCurrency: to,
        amount: n,
        rate,
        feePercent,
        feeAmount,
        finalAmount,
        expiresAt,
      },
    });

    return {
      quoteId: quote.id,
      from,
      to,
      amount: n,
      rate,
      feePercent,
      feeAmount,
      finalAmount,
      expiresAt: quote.expiresAt,
    };
  }

  async executeConversion(userId: string, quoteId: unknown) {
    if (typeof quoteId !== 'string' || !quoteId.trim()) {
      throw new BadRequestException('quoteId obligatwa');
    }

    return this.prisma.$transaction(
      async (tx) => {
        const now = new Date();

        // Reklamasyon atomik — sèl sous verite pou idanpotans/anti-doub-soumèt
        // ak ekspirasyon. Yon WHERE ki gen userId + consumedAt:null +
        // expiresAt>now garanti sèlman YON apèl ka reyisi pou menm quoteId a,
        // menm si 2 rekèt rive an menm tan (count=0 pou dezyèm nan).
        const claim = await tx.conversionQuote.updateMany({
          where: { id: quoteId, userId, consumedAt: null, expiresAt: { gt: now } },
          data: { consumedAt: now },
        });

        if (claim.count === 0) {
          throw new BadRequestException('Devis envalid, ekspire, oswa deja itilize');
        }

        const quote = await tx.conversionQuote.findUnique({ where: { id: quoteId } });
        if (!quote) {
          throw new BadRequestException('Devis envalid, ekspire, oswa deja itilize');
        }

        const amount = Number(quote.amount);
        const finalAmount = Number(quote.finalAmount);
        const from = quote.fromCurrency;
        const to = quote.toCurrency;

        const wallet = await tx.wallet.findUnique({ where: { userId } });
        if (!wallet) throw new NotFoundException('Wallet pa jwenn');

        // DEBI — balans fè pati WHERE la menm (pa yon lekti separe) : sou
        // konkirans, se yon sèl UPDATE ki ka genyen, menm patwon ak
        // agentWallet/withdraw yo pi wo.
        let debitBefore: number;
        let debitAfter: number;

        if (from === 'HTG') {
          debitBefore = Number(wallet.balance);
          const debit = await tx.wallet.updateMany({
            where: { userId, balance: { gte: amount } },
            data: { balance: { decrement: amount } },
          });
          if (debit.count === 0) throw new BadRequestException('Balans ensifizan');
          debitAfter = this.round(debitBefore - amount);
        } else {
          const existing = await tx.walletCurrencyBalance.findUnique({
            where: { userId_currency: { userId, currency: from } },
          });
          debitBefore = Number(existing?.balance || 0);
          const debit = await tx.walletCurrencyBalance.updateMany({
            where: { userId, currency: from, balance: { gte: amount } },
            data: { balance: { decrement: amount } },
          });
          if (debit.count === 0) throw new BadRequestException('Balans ensifizan');
          debitAfter = this.round(debitBefore - amount);
        }

        // KREDI — lòt janm lan.
        let creditBefore: number;
        let creditAfter: number;

        if (to === 'HTG') {
          const currentWallet =
            from === 'HTG' ? wallet : await tx.wallet.findUnique({ where: { userId } });
          creditBefore = Number(currentWallet!.balance);
          await tx.wallet.update({
            where: { userId },
            data: { balance: { increment: finalAmount } },
          });
          creditAfter = this.round(creditBefore + finalAmount);
        } else {
          const existingTo = await tx.walletCurrencyBalance.findUnique({
            where: { userId_currency: { userId, currency: to } },
          });
          creditBefore = Number(existingTo?.balance || 0);
          await tx.walletCurrencyBalance.upsert({
            where: { userId_currency: { userId, currency: to } },
            update: { balance: { increment: finalAmount } },
            create: { userId, currency: to, balance: finalAmount },
          });
          creditAfter = this.round(creditBefore + finalAmount);
        }

        const reference = `CV-${uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase()}`;

        const transaction = await tx.transaction.create({
          data: {
            reference,
            type: 'CONVERSION',
            status: 'COMPLETED',
            amount,
            fee: quote.feeAmount,
            netAmount: finalAmount,
            currency: from,
            senderWalletId: wallet.id,
            receiverWalletId: wallet.id,
            title: `Konvèsyon ${from} → ${to}`,
            description: `${amount} ${from} → ${finalAmount} ${to} (frè ${quote.feeAmount} ${to})`,
          },
        });

        await tx.ledgerEntry.create({
          data: {
            walletId: wallet.id,
            transactionId: transaction.id,
            type: 'DEBIT',
            amount,
            balanceBefore: debitBefore,
            balanceAfter: debitAfter,
            currency: from,
            description: `Konvèsyon soti ${from}`,
          },
        });

        await tx.ledgerEntry.create({
          data: {
            walletId: wallet.id,
            transactionId: transaction.id,
            type: 'CREDIT',
            amount: finalAmount,
            balanceBefore: creditBefore,
            balanceAfter: creditAfter,
            currency: to,
            description: `Konvèsyon rive ${to}`,
          },
        });

        return {
          success: true,
          transactionId: transaction.id,
          reference,
          debited: { currency: from, amount },
          credited: { currency: to, amount: finalAmount },
          fee: { currency: to, amount: Number(quote.feeAmount) },
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}