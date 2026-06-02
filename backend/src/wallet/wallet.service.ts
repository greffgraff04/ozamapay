import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';


const FEES = {
  TOPUP: 0.06,
  TRANSFER: 0.0099,
  WITHDRAW: 0.02,
};

const MASTER_ID = process.env.OZAMAPAY_MASTER_ID as string;

const INTERNATIONAL_METHODS = ['ZELLE', 'CASHAPP', 'WISE', 'MERU', 'BANK', 'USDT'];
const isInternational = (method: string) => INTERNATIONAL_METHODS.includes(method.toUpperCase());

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  // ======================================================
  // HELPERS
  // ======================================================

  private async checkKyc(userId: string) {
    const kyc = await this.prisma.kyc.findUnique({
      where: {
        userId,
      },
    });

    if (!kyc) {
      throw new ForbiddenException(
        'Ou dwe fè KYC avan',
      );
    }

    if (kyc.status !== 'APPROVED') {
      throw new ForbiddenException(
        `KYC ou an ${kyc.status}`,
      );
    }
  }

  private round(value: number) {
    return Math.round(value * 100) / 100;
  }

  private async getUsdHtgRate(): Promise<number> {
    const entry = await this.prisma.rate.findUnique({ where: { key: 'USD_HTG' } });
    return Number(entry?.value || 140);
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

  async getTransactions(userId: string) {
    return this.prisma.transaction.findMany({
      where: {
        OR: [
          {
            senderWallet: {
              userId,
            },
          },
          {
            receiverWallet: {
              userId,
            },
          },
        ],
      },
      include: {
        senderWallet: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        receiverWallet: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
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
    await this.checkKyc(senderId);

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
    await this.checkKyc(senderId);

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

    return this.prisma.$transaction(async (tx) => {
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
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet pa jwenn');

    const amountHTG = isInternational(method)
      ? this.round(amount * await this.getUsdHtgRate())
      : amount;

    const fee = this.round(amountHTG * FEES.TOPUP);
    // Fee is on top — user receives the full HTG equivalent
    const reference = `TOPUP-${uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase()}`;

    return this.prisma.transaction.create({
      data: {
        reference,
        receiverWalletId: wallet.id,
        amount: amountHTG,
        fee,
        netAmount: amountHTG,
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
    await this.checkKyc(userId);

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet pa jwenn');

    const amountHTG = isInternational(method)
      ? this.round(amount * await this.getUsdHtgRate())
      : amount;

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
    await this.checkKyc(userId);
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
}