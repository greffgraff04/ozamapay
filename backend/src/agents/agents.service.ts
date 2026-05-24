import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import {
  AgentTopupDto,
  AgentWithdrawDto,
} from './dto/agent-transactions.dto';

@Injectable()
export class AgentsService {
  constructor(
    private prisma: PrismaService,
  ) {}

  // ========================================
  // APPLY AS AGENT
  // ========================================

  async applyAsAgent(
    userId: string,
    businessName?: string,
  ) {
    const existing =
      await this.prisma.agent.findUnique({
        where: {
          userId,
        },
      });

    if (existing) {
      throw new BadRequestException(
        'Ou deja gen yon kont agent',
      );
    }

    const agentCode = `OZA-${Math.floor(
      100000 + Math.random() * 900000,
    )}`;

    return this.prisma.$transaction(
      async (tx) => {
        const agent =
          await tx.agent.create({
            data: {
              userId,
              businessName,
              agentCode,
              status: 'PENDING',
              level: 'BRONZE',
            },
          });

        await tx.agentWallet.create({
          data: {
            agentId: agent.id,
            balance: 0,
          },
        });

        return agent;
      },
    );
  }

  // ========================================
  // GET MY DASHBOARD
  // ========================================

  async getMyAgentDashboard(
    userId: string,
  ) {
    const agent =
      await this.prisma.agent.findUnique({
        where: {
          userId,
        },

        include: {
          wallet: true,

          commissions: {
            orderBy: {
              createdAt: 'desc',
            },

            take: 10,
          },
        },
      });

    if (!agent) {
      throw new BadRequestException(
        'Kont agent pa jwenn',
      );
    }

    return {
      agent,
    };
  }

  // ========================================
  // GET COMMISSIONS
  // ========================================

  async getMyCommissions(
    userId: string,
  ) {
    const agent =
      await this.prisma.agent.findUnique({
        where: {
          userId,
        },
      });

    if (!agent) {
      throw new BadRequestException(
        'Agent pa jwenn',
      );
    }

    return this.prisma.commission.findMany({
      where: {
        agentId: agent.id,
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // ========================================
  // AGENT WITHDRAW COMMISSION
  // ========================================

  async withdrawCommission(
    userId: string,
    amount: number,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const agent =
          await tx.agent.findUnique({
            where: {
              userId,
            },

            include: {
              wallet: true,
            },
          });

        if (!agent) {
          throw new BadRequestException(
            'Agent pa jwenn',
          );
        }

        const currentBalance = Number(
          agent.wallet?.balance || 0,
        );

        if (
          currentBalance < amount
        ) {
          throw new BadRequestException(
            'Balance insuffisant',
          );
        }

        const userWallet =
          await tx.wallet.findUnique({
            where: {
              userId,
            },
          });

        if (!userWallet) {
          throw new BadRequestException(
            'Wallet pa jwenn',
          );
        }

        await tx.agentWallet.update({
          where: {
            agentId: agent.id,
          },

          data: {
            balance: {
              decrement: amount,
            },
          },
        });

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

        return {
          success: true,
          amount,
        };
      },
    );
  }

  // ========================================
  // AGENT TOPUP USER
  // ========================================

  async topupUser(
    agentUserId: string,
    dto: AgentTopupDto,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const agent =
          await tx.agent.findUnique({
            where: {
              userId: agentUserId,
            },

            include: {
              wallet: true,
            },
          });

        if (!agent) {
          throw new BadRequestException(
            'Agent pa jwenn',
          );
        }

        if (
          agent.status !== 'ACTIVE'
        ) {
          throw new BadRequestException(
            'Agent pa apwouve',
          );
        }

        const userWallet =
          await tx.wallet.findUnique({
            where: {
              userId: dto.userId,
            },
          });

        if (!userWallet) {
          throw new BadRequestException(
            'Wallet user pa jwenn',
          );
        }

        const amount =
          Number(dto.amount);

        // =========================
        // FEES
        // =========================

        const totalFee =
          amount * 0.06;

        const agentCommission =
          amount * 0.02;

        const ozamaRevenue =
          amount * 0.04;

        const finalAmount =
          amount - totalFee;

        // =========================
        // VERIFY AGENT BALANCE
        // =========================

        if (
          Number(
            agent.wallet?.balance || 0,
          ) < amount
        ) {
          throw new BadRequestException(
            'Agent pa gen ase lajan',
          );
        }

        // =========================
        // DEBIT AGENT
        // =========================

        await tx.agentWallet.update({
          where: {
            agentId: agent.id,
          },

          data: {
            balance: {
              decrement: amount,
            },
          },
        });

        // =========================
        // CREDIT USER
        // =========================

        await tx.wallet.update({
          where: {
            userId: dto.userId,
          },

          data: {
            balance: {
              increment:
                finalAmount,
            },
          },
        });

        // =========================
        // UPDATE AGENT STATS
        // =========================

        await tx.agent.update({
          where: {
            id: agent.id,
          },

          data: {
            totalTopupVolume: {
              increment: amount,
            },

            totalCommission: {
              increment:
                agentCommission,
            },
          },
        });

        // =========================
        // CREDIT AGENT COMMISSION
        // =========================

        await tx.agentWallet.update({
          where: {
            agentId: agent.id,
          },

          data: {
            balance: {
              increment:
                agentCommission,
            },
          },
        });

        // =========================
        // TRANSACTION
        // =========================

        const transaction =
          await tx.transaction.create({
            data: {
              reference: `AT-${Date.now()}`,

              type: 'PAYMENT',

              status: 'COMPLETED',

              amount,

              netAmount:
                finalAmount,

              fee: totalFee,

              title:
                'Agent Topup',

              description:
                'Topup via agent',

              receiverWalletId:
                userWallet.id,
            },
          });

        // =========================
        // COMMISSION LOG
        // =========================

        await tx.commission.create({
          data: {
            agentId: agent.id,

            transactionId:
              transaction.id,

            type: 'TOPUP',

            amount:
              agentCommission,
          },
        });

        return {
          success: true,

          amount,

          fee: totalFee,

          agentCommission,

          ozamaRevenue,

          received:
            finalAmount,
        };
      },
    );
  }

  // ========================================
  // AGENT WITHDRAW USER
  // ========================================

  async withdrawForUser(
    agentUserId: string,
    dto: AgentWithdrawDto,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const agent =
          await tx.agent.findUnique({
            where: {
              userId: agentUserId,
            },

            include: {
              wallet: true,
            },
          });

        if (!agent) {
          throw new BadRequestException(
            'Agent pa jwenn',
          );
        }

        if (
          agent.status !== 'ACTIVE'
        ) {
          throw new BadRequestException(
            'Agent pa apwouve',
          );
        }

        const userWallet =
          await tx.wallet.findUnique({
            where: {
              userId: dto.userId,
            },
          });

        if (!userWallet) {
          throw new BadRequestException(
            'Wallet user pa jwenn',
          );
        }

        const amount =
          Number(dto.amount);

        // =========================
        // FEES
        // =========================

        const totalFee =
          amount * 0.02;

        const agentCommission =
          amount * 0.0075;

        const ozamaRevenue =
          amount * 0.0125;

        const totalDebit =
          amount + totalFee;

        // =========================
        // VERIFY USER BALANCE
        // =========================

        if (
          Number(
            userWallet.balance,
          ) < totalDebit
        ) {
          throw new BadRequestException(
            'Balance insuffisant',
          );
        }

        // =========================
        // DEBIT USER
        // =========================

        await tx.wallet.update({
          where: {
            userId: dto.userId,
          },

          data: {
            balance: {
              decrement:
                totalDebit,
            },
          },
        });

        // =========================
        // CREDIT AGENT
        // =========================

        await tx.agentWallet.update({
          where: {
            agentId: agent.id,
          },

          data: {
            balance: {
              increment:
                amount +
                agentCommission,
            },
          },
        });

        // =========================
        // UPDATE STATS
        // =========================

        await tx.agent.update({
          where: {
            id: agent.id,
          },

          data: {
            totalWithdrawalVolume:
              {
                increment:
                  amount,
              },

            totalCommission: {
              increment:
                agentCommission,
            },
          },
        });

        // =========================
        // TRANSACTION
        // =========================

        const transaction =
          await tx.transaction.create({
            data: {
              reference: `AW-${Date.now()}`,

              type: 'WITHDRAWAL',

              status: 'COMPLETED',

              amount,

              netAmount:
                amount,

              fee: totalFee,

              title:
                'Agent Withdraw',

              description:
                'Retrait via agent',

              senderWalletId:
                userWallet.id,
            },
          });

        // =========================
        // COMMISSION LOG
        // =========================

        await tx.commission.create({
          data: {
            agentId: agent.id,

            transactionId:
              transaction.id,

            type: 'WITHDRAWAL',

            amount:
              agentCommission,
          },
        });

        return {
          success: true,

          amount,

          fee: totalFee,

          agentCommission,

          ozamaRevenue,

          debited:
            totalDebit,
        };
      },
    );
  }
}