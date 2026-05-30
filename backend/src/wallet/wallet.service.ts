import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';


const FEES = {
  TOPUP: 0.06,
  TRANSFER: 0.0099,
  WITHDRAW: 0.02,
};

const MASTER_ID = process.env.OZAMAPAY_MASTER_ID as string;

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
    if (!sender.transactionPin || sender.transactionPin !== pin) {
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

    // 4. Verifye si li gen ase kòb
    if (Number(senderWallet.balance) < transferAmount) {
      throw new BadRequestException('Balans ensifizan');
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

      const reference = 'P2P-' + Date.now();

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
    });
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
    if (!sender.transactionPin || sender.transactionPin !== pin) {
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

    if (Number(senderWallet.balance) < totalDebit) {
      throw new BadRequestException('Balans ensifizan');
    }

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

      const reference = 'TRX-' + Date.now();

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
    });
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

    const fee = this.round(amount * FEES.TOPUP);
    const netAmount = this.round(amount - fee);
    const reference = 'TOPUP-' + Date.now();

    return this.prisma.transaction.create({
      data: {
        reference,
        receiverWalletId: wallet.id,
        amount,
        fee,
        netAmount,
        type: 'TOPUP',
        status: 'PENDING',
        method,
        title: `Depot via ${method} — ${amount} HTG`,
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
    });
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

    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet pa jwenn');
    }

    const fee = this.round(amount * FEES.WITHDRAW);
    const totalDebit = amount + fee;

    if (Number(wallet.balance) < totalDebit) {
      throw new BadRequestException('Balans ensifizan');
    }

    const reference = 'WD-' + Date.now();

    return this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { userId },
        data: { balance: { decrement: totalDebit } },
      });

      return tx.transaction.create({
        data: {
          reference,
          senderWalletId: wallet.id,
          amount,
          fee,
          netAmount: this.round(amount - fee),
          type: 'WITHDRAWAL',
          status: 'PENDING',
          method,
          description: accountInfo,
          title: `Retrè via ${method} — ${amount} HTG`,
        },
      });
    });
  }

  // ======================================================
  // SERVICE REQUEST
  // ======================================================

  async createFinanceRequest(
    userId: string,
    serviceType: any,
    amount: number,
    details: string,
  ) {
    return this.prisma.serviceRequest.create({
      data: {
        userId,
        serviceType,
        amount,
        fee: 0,
        details,
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
          reference: 'ADMIN-' + Date.now(),
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
}