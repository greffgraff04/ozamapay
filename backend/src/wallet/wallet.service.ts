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
  WITHDRAW: 0.06,
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
      // 🌟 NOUVO: Nou enkli relasyon yo pou n ka jwenn non moun yo
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
  // P2P TRANSFER (SAN FRAIS ET SÉCURISÉ)
  // ======================================================

  async transferP2P(
    senderId: string,
    recipientEmail: string,
    amount: number,
  ) {
    // 1. Verifye si moun k ap voye a gen KYC approved
    await this.checkKyc(senderId);

    const transferAmount = Number(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      throw new BadRequestException('Montan invalid');
    }

    // 2. Jwenn bous moun k ap voye a
    const senderWallet = await this.prisma.wallet.findUnique({
      where: { userId: senderId },
    });

    if (!senderWallet) {
      throw new NotFoundException('Wallet sender pa jwenn');
    }

    // 3. Verifye si li gen ase kòb (Frè a se 0, donk nou jis tcheke montan an)
    if (Number(senderWallet.balance) < transferAmount) {
      throw new BadRequestException('Balans ensifizan');
    }

    // 4. Jwenn moun k ap resevwa a pa imèl li
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

    // 5. Kouri tranzaksyon sekirize a nan Prisma ($transaction)
    return this.prisma.$transaction(async (tx) => {
      // Debite moun k ap voye a
      await tx.wallet.update({
        where: { userId: senderId },
        data: {
          balance: { decrement: transferAmount },
        },
      });

      // Kredite moun k ap resevwa a
      await tx.wallet.update({
        where: { userId: recipient.id },
        data: {
          balance: { increment: transferAmount },
        },
      });

      const reference = 'P2P-' + Date.now();

      // Kreye istorik tranzaksyon an pou tou de itilizatè yo ka wè l nan tablodbò yo
      const transaction = await tx.transaction.create({
        data: {
          reference,
          senderWalletId: senderWallet.id,
          receiverWalletId: recipient.wallet?.id,
          amount: transferAmount,
          fee: 0, // 0 frais !
          netAmount: transferAmount,
          type: 'TRANSFER',
          status: 'COMPLETED',
          method: 'OZAMAPAY',
          title: `P2P bay ${recipient.email}`,
        },
      });

      return {
        message: 'Transfer P2P reyisi',
        transaction,
      };
    });
  }

  // ======================================================
// TRANSFER (WITH FEES)
// ======================================================

async transfer(
  senderId: string,
  recipientEmail: string,
  amount: number,
) {
  await this.checkKyc(senderId);

  const cleanAmount = Number(amount);

  if (isNaN(cleanAmount) || cleanAmount <= 0) {
    throw new BadRequestException(
      'Montan invalid',
    );
  }

  // ======================================================
  // SENDER WALLET
  // ======================================================

  const senderWallet =
    await this.prisma.wallet.findUnique({
      where: {
        userId: senderId,
      },
    });

  if (!senderWallet) {
    throw new NotFoundException(
      'Wallet sender pa jwenn',
    );
  }

  // ======================================================
  // RECIPIENT
  // ======================================================

  const recipient =
    await this.prisma.user.findUnique({
      where: {
        email: recipientEmail
          .toLowerCase()
          .trim(),
      },

      include: {
        wallet: true,
      },
    });

  if (!recipient || !recipient.wallet) {
    throw new NotFoundException(
      'Destinatè pa jwenn',
    );
  }

  if (recipient.id === senderId) {
    throw new BadRequestException(
      'Ou pa ka voye kòb bay tèt ou',
    );
  }

  // ======================================================
  // FEES
  // ======================================================

  // 👑 NOUVO KÒD LA (0% FRÈ - GRATIS NÈT)
  const fee = 0;

  const totalDebit = this.round(
    cleanAmount + fee, // fee a se 0, donk totalDebit === cleanAmount
  );

  if (
    Number(senderWallet.balance) <
    totalDebit
  ) {
    throw new BadRequestException(
      'Balans ensifizan',
    );
  }

  // ======================================================
  // MASTER WALLET CHECK
  // ======================================================

  let masterWallet =
    await this.prisma.wallet.findUnique({
      where: {
        userId: MASTER_ID,
      },
    });

  // Auto create master wallet si li pa egziste
  if (!masterWallet) {
    masterWallet =
      await this.prisma.wallet.create({
        data: {
          userId: MASTER_ID,
          balance: 0,
        },
      });
  }

  // ======================================================
  // TRANSACTION
  // ======================================================

  return this.prisma.$transaction(
    async (tx) => {
      // DEBIT SENDER
      await tx.wallet.update({
        where: {
          userId: senderId,
        },

        data: {
          balance: {
            decrement: totalDebit,
          },
        },
      });

      // CREDIT RECIPIENT
      await tx.wallet.update({
        where: {
          userId: recipient.id,
        },

        data: {
          balance: {
            increment: cleanAmount,
          },
        },
      });

      // CREDIT MASTER FEES
      await tx.wallet.update({
        where: {
          userId: MASTER_ID,
        },

        data: {
          balance: {
            increment: fee,
          },
        },
      });

      const reference =
        'TRX-' + Date.now();

      const transaction =
        await tx.transaction.create({
          data: {
            reference,

            senderWalletId:
              senderWallet.id,

            receiverWalletId:
  recipient.wallet!.id,

            amount: cleanAmount,

            fee,

            netAmount: cleanAmount,

            type: 'TRANSFER',

            status: 'COMPLETED',

            method: 'OZAMAPAY',

            title: `Transfer bay ${recipient.email}`,
          },
        });

      return {
        message: 'Transfer reyisi',
        transaction,
      };
    },
  );
}

  // ======================================================
  // MANUAL TOPUP
  // ======================================================

  async createManualTopup(
    userId: string,
    amount: number,
    method: string,
    proofImage: string,
  ) {
    await this.checkKyc(userId);

    const reference =
      'TOPUP-' + Date.now();

    return this.prisma.transaction.create({
      data: {
        reference,

        amount,

        fee: 0,

        netAmount: amount,

        type: 'DEPOSIT',

        status: 'PENDING',

        method,

        proofImage,

        title: `Topup via ${method}`,
      },
    });
  }

  // ======================================================
  // APPROVE TOPUP
  // ======================================================

  async approveTopup(
    transactionId: string,
    userId: string,
  ) {
    const transaction =
      await this.prisma.transaction.findUnique({
        where: {
          id: transactionId,
        },
      });

    if (!transaction) {
      throw new NotFoundException(
        'Transaction pa jwenn',
      );
    }

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

    const fee = this.round(
      Number(transaction.amount) *
        FEES.TOPUP,
    );

    const netAmount = this.round(
      Number(transaction.amount) - fee,
    );

    return this.prisma.$transaction(
      async (tx) => {
        await tx.wallet.update({
          where: {
            userId,
          },

          data: {
            balance: {
              increment: netAmount,
            },
          },
        });

        await tx.wallet.update({
          where: {
            userId: MASTER_ID,
          },

          data: {
            balance: {
              increment: fee,
            },
          },
        });

        const updated =
          await tx.transaction.update({
            where: {
              id: transaction.id,
            },

            data: {
              status: 'COMPLETED',
            },
          });

        return updated;
      },
    );
  }

  // ======================================================
  // REJECT TOPUP
  // ======================================================

  async rejectTopup(
    transactionId: string,
  ) {
    return this.prisma.transaction.update({
      where: {
        id: transactionId,
      },

      data: {
        status: 'REJECTED',
      },
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

    const fee = this.round(
      amount * FEES.WITHDRAW,
    );

    const totalDebit =
      amount + fee;

    if (
      Number(wallet.balance) <
      totalDebit
    ) {
      throw new BadRequestException(
        'Balans ensifizan',
      );
    }

    const reference =
      'WD-' + Date.now();

    return this.prisma.transaction.create({
      data: {
        reference,

        senderWalletId: wallet.id,

        amount,

        fee,

        netAmount: amount,

        type: 'WITHDRAW',

        status: 'PENDING',

        method,

        description: accountInfo,

        title: `Retrait via ${method}`,
      },
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

  async adminTopup(
    userId: string,
    amount: number,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const wallet =
          await tx.wallet.findUnique({
            where: {
              userId,
            },
          });

        if (!wallet) {
          throw new NotFoundException(
            'Wallet pa jwenn',
          );
        }

        const updated =
          await tx.wallet.update({
            where: {
              userId,
            },

            data: {
              balance: {
                increment: amount,
              },
            },
          });

        await tx.transaction.create({
          data: {
            reference:
              'ADMIN-' + Date.now(),

            receiverWalletId:
              wallet.id,

            amount,

            fee: 0,

            netAmount: amount,

            type: 'DEPOSIT',

            status: 'COMPLETED',

            method: 'ADMIN',

            title: 'Admin Topup',
          },
        });

        return updated;
      },
    );
  }

  // ======================================================
  // STATS
  // ======================================================

  async getStats() {
    const users =
      await this.prisma.user.count();

    const transactions =
      await this.prisma.transaction.count();

    const pending =
      await this.prisma.transaction.count({
        where: {
          status: 'PENDING',
        },
      });

    const volume =
      await this.prisma.transaction.aggregate({
        _sum: {
          amount: true,
        },
      });

    return {
      users,
      transactions,
      pending,

      volume:
        volume._sum.amount || 0,
    };
  }
  
}