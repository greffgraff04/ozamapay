import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

import {
  AgentTopupDto,
  AgentWithdrawDto,
} from './dto/agent-transactions.dto';

const MASTER_ID = process.env.OZAMAPAY_MASTER_ID as string;

@Injectable()
export class AgentsService {
  constructor(
    private prisma: PrismaService,
  ) {}

  // ========================================
  // CREATE LIQUIDITY REQUEST
  // ========================================
  async createLiquidityRequest(
    userId: string,
    amount: number,
    method: 'MONCASH' | 'ZELLE' | 'CASH' | 'BANK',
    accountInfo: string,
  ) {
    const agent = await this.prisma.agent.findUnique({
      where: { userId },
      include: { wallet: true },
    });

    if (!agent) {
      throw new BadRequestException('Agent pa jwenn');
    }

    if (agent.status !== 'ACTIVE') {
      throw new BadRequestException('Agent pa apwouve');
    }

    if (Number(agent.wallet?.balance || 0) < amount) {
      throw new BadRequestException(
        'AgentWallet balance ensifizan pou demand sa a',
      );
    }

    return this.prisma.liquidityRequest.create({
      data: {
        agentId: agent.id,
        amount,
        method,
        accountInfo,
        status: 'PENDING',
      },
    });
  }

  // ========================================
  // GET MY LIQUIDITY REQUESTS
  // ========================================
  async getMyLiquidityRequests(userId: string) {
    const agent = await this.prisma.agent.findUnique({ where: { userId } });
    if (!agent) throw new BadRequestException('Agent pa jwenn');
    return this.prisma.liquidityRequest.findMany({
      where: { agentId: agent.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ========================================
  // APPLY AS AGENT
  // ========================================
  async applyAsAgent(
    userId: string,
    businessName?: string,
  ) {
    const existing =
      await this.prisma.agent.findUnique({
        where: { userId },
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
        where: { userId },

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

    return { agent };
  }

  // ========================================
  // GET COMMISSIONS
  // ========================================
  async getMyCommissions(
    userId: string,
  ) {
    const agent =
      await this.prisma.agent.findUnique({
        where: { userId },
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
  // WITHDRAW AGENT COMMISSION
  // ========================================
  async withdrawCommission(
    userId: string,
    amount: number,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const agent =
          await tx.agent.findUnique({
            where: { userId },

            include: {
              wallet: true,
            },
          });

        if (!agent) {
          throw new BadRequestException(
            'Agent pa jwenn',
          );
        }

        const currentBalance =
          Number(
            agent.wallet?.balance || 0,
          );

        if (currentBalance < amount) {
          throw new BadRequestException(
            'Balance insuffisant',
          );
        }

        const userWallet =
          await tx.wallet.findUnique({
            where: { userId },
          });

        if (!userWallet) {
          throw new BadRequestException(
            'Wallet pa jwenn',
          );
        }

        // DEBIT AGENT
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

        // CREDIT USER
        await tx.wallet.update({
          where: { userId },

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
        // VERIFY AGENT
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

        // VERIFY CLIENT EMAIL
        if (!dto.email) {
          throw new BadRequestException(
            'Email kliyan an obligatwa',
          );
        }

        // FIND CLIENT
        const clientUser =
          await tx.user.findUnique({
            where: {
              email: dto.email
                .toLowerCase()
                .trim(),
            },
          });

        if (!clientUser) {
          throw new NotFoundException(
            'Kliyan an pa jwenn',
          );
        }

        // FIND CLIENT WALLET
        const userWallet =
          await tx.wallet.findUnique({
            where: {
              userId: clientUser.id,
            },
          });

        if (!userWallet) {
          throw new BadRequestException(
            'Wallet kliyan an pa jwenn',
          );
        }

        const amount = Number(
          dto.amount,
        );

        // FEES
        const totalFee =
          amount * 0.06;

        const agentCommission =
          amount * 0.02;

        const ozamaRevenue =
          amount * 0.04;

        const finalAmount =
          amount - totalFee;

        // VERIFY AGENT BALANCE
        if (
          Number(
            agent.wallet?.balance ||
              0,
          ) < amount
        ) {
          throw new BadRequestException(
            'Agent pa gen ase lajan',
          );
        }

        // DEBIT AGENT
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

        // CREDIT USER
        await tx.wallet.update({
          where: {
            userId: clientUser.id,
          },

          data: {
            balance: {
              increment:
                finalAmount,
            },
          },
        });

        // UPDATE AGENT STATS
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

        // CREDIT AGENT COMMISSION
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

        // TRANSACTION
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
                `Topup via agent pou ${dto.email}`,

              receiverWalletId:
                userWallet.id,
            },
          });

        // COMMISSION LOG
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

        // CREDIT OZAMA MASTER
        const masterWallet = await tx.wallet.findFirst({ where: { userId: MASTER_ID } });
        if (masterWallet) {
          await tx.wallet.update({
            where: { id: masterWallet.id },
            data: { balance: { increment: ozamaRevenue } },
          });
        }

        return {
          success: true,
          amount,
          fee: totalFee,
          agentCommission,
          ozamaRevenue,
          received: finalAmount,
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
    // VERIFY AGENT
    const agent =
      await this.prisma.agent.findUnique(
        {
          where: {
            userId: agentUserId,
          },

          include: {
            wallet: true,
          },
        },
      );

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

    // VERIFY EMAIL
    if (!dto.email) {
      throw new BadRequestException(
        'Email kliyan an obligatwa',
      );
    }

    // FIND CLIENT
    const clientUser =
      await this.prisma.user.findUnique(
        {
          where: {
            email:
              dto.email
                .toLowerCase()
                .trim(),
          },
        },
      );

    if (!clientUser) {
      throw new NotFoundException(
        'Kliyan sa a pa egziste.',
      );
    }

    // VERIFY PIN
    const agentPinValid = clientUser.transactionPin &&
      await bcrypt.compare(dto.userPin, clientUser.transactionPin);
    if (!agentPinValid) {
      throw new BadRequestException(
        'PIN kliyan an enkòrèk.',
      );
    }

    // FIND WALLET
    const userWallet =
      await this.prisma.wallet.findUnique(
        {
          where: {
            userId: clientUser.id,
          },
        },
      );

    if (!userWallet) {
      throw new BadRequestException(
        'Wallet kliyan an pa jwenn',
      );
    }

    const amount = Number(
      dto.amount,
    );

    // FEES
    const totalFee =
      amount * 0.02;

    const agentCommission =
      amount * 0.0075;

    const ozamaRevenue =
      amount * 0.0125;

    const totalDebit =
      amount + totalFee;

    // VERIFY USER BALANCE
    if (
      Number(userWallet.balance) <
      totalDebit
    ) {
      throw new BadRequestException(
        'Balans kliyan an ensifizan.',
      );
    }

    // TRANSACTION
    return this.prisma.$transaction(
      async (tx) => {
        // DEBIT USER
        await tx.wallet.update({
          where: {
            userId:
              clientUser.id,
          },

          data: {
            balance: {
              decrement:
                totalDebit,
            },
          },
        });

        // CREDIT AGENT
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

        // UPDATE STATS
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

        // CREATE TRANSACTION
        const transaction =
          await tx.transaction.create({
            data: {
              reference: `AW-${Date.now()}`,

              type:
                'WITHDRAWAL',

              status:
                'COMPLETED',

              amount,

              netAmount:
                amount,

              fee: totalFee,

              title:
                'Agent Withdraw',

              description:
                `Retrait via agent pou ${dto.email}`,

              senderWalletId:
                userWallet.id,
            },
          });

        // COMMISSION LOG
        await tx.commission.create({
          data: {
            agentId: agent.id,

            transactionId:
              transaction.id,

            type:
              'WITHDRAWAL',

            amount:
              agentCommission,
          },
        });

        // CREDIT OZAMA MASTER
        const masterWallet = await tx.wallet.findFirst({ where: { userId: MASTER_ID } });
        if (masterWallet) {
          await tx.wallet.update({
            where: { id: masterWallet.id },
            data: { balance: { increment: ozamaRevenue } },
          });
        }

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

  async verifyAgent(agentCode: string) {
    return this.prisma.agent.findFirst({
      where: { agentCode, status: 'ACTIVE' },
      include: { user: { select: { name: true } } },
    });
  }
}