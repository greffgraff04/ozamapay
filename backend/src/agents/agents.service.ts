import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcrypt';

import {
  AgentTopupDto,
  AgentWithdrawDto,
} from './dto/agent-transactions.dto';

const MASTER_ID = process.env.OZAMAPAY_MASTER_ID as string;

// Plafon pou chak operasyon ajan — HTG. Montan topup/retrè kliyan an pwatik
// toujou lwen anba sa a (kraze lajan kach nan men yon ajan), chif sa a se yon
// gad-fou kont erè/abi, pa yon limit operasyonèl nòmal.
const AGENT_TOPUP_MAX_HTG = 200_000;
const AGENT_WITHDRAW_COMMISSION_MAX_HTG = 200_000;
// Demand likidite se yon reyapwovizyonman an gwo pou ajan an (pa yon
// operasyon kliyan inik) — admin toujou revize l manyèlman anvan lajan vrè
// deplase, men nou bloke valè absurd/negatif anvan yo rive nan koute admin lan.
const AGENT_LIQUIDITY_REQUEST_MAX_HTG = 500_000;

@Injectable()
export class AgentsService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  // Gad-fou kominn pou tout montan ajan — rejte AVAN okenn lekti/ekriti DB.
  // Negatif/zero/NaN te pèmèt envèse sans PIN oswa kreye balans ki pa gen
  // okenn sipò reyèl (wè hotfix/agents-amount).
  private assertValidAgentAmount(amount: unknown, max: number, label: string): number {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      throw new BadRequestException(`${label}: montan envalid — dwe yon nonb pozitif`);
    }
    const cents = Math.round(n * 100);
    if (Math.abs(n * 100 - cents) > 1e-6) {
      throw new BadRequestException(`${label}: maksimòm 2 chif apre pwen`);
    }
    if (n > max) {
      throw new BadRequestException(`${label}: depase plafon maksimòm (${max} HTG)`);
    }
    return n;
  }

  // ========================================
  // CREATE LIQUIDITY REQUEST
  // ========================================
  async createLiquidityRequest(
    userId: string,
    amount: number,
    method: 'MONCASH' | 'ZELLE' | 'CASH' | 'BANK',
    accountInfo: string,
  ) {
    amount = this.assertValidAgentAmount(
      amount,
      AGENT_LIQUIDITY_REQUEST_MAX_HTG,
      'Demand likidite',
    );

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
    amount = this.assertValidAgentAmount(
      amount,
      AGENT_WITHDRAW_COMMISSION_MAX_HTG,
      'Retrè komisyon',
    );

    return this.prisma.$transaction(
      async (tx) => {
        const agent =
          await tx.agent.findUnique({
            where: { userId },
          });

        // Menm kontwòl wòl ak topup/liquidity-request : sèlman yon ajan
        // status=ACTIVE ka retire komisyon. San sa a, yon itilizatè ki pa
        // janm aplike kòm ajan (oswa ki PENDING/SUSPENDED) pa dwe ka rive
        // menm nan verifikasyon balans — se yon aksyon entèdi, pa yon ka
        // "resous pa jwenn" (403, pa 400).
        if (!agent || agent.status !== 'ACTIVE') {
          throw new ForbiddenException(
            'Ou pa yon ajan aktif — aksyon sa a entèdi',
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

        // DEBIT AGENT — kondisyon balans fè pati WHERE la menm, pa yon
        // lekti separe (menm patwon ak gift cards): sou konkirans, Postgres
        // vewouye liy lan nan UPDATE a, se yon sèl kòmand ki ka genyen.
        const debit = await tx.agentWallet.updateMany({
          where: {
            agentId: agent.id,
            balance: { gte: amount },
          },
          data: {
            balance: {
              decrement: amount,
            },
          },
        });

        if (debit.count === 0) {
          throw new BadRequestException(
            'Balance insuffisant',
          );
        }

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
    const validatedAmount = this.assertValidAgentAmount(
      dto.amount,
      AGENT_TOPUP_MAX_HTG,
      'Topup',
    );

    const agentUser = await this.prisma.user.findUnique({
      where: { id: agentUserId },
      select: { email: true, name: true },
    });
    let _clientEmail = '';
    let _clientName = '';
    let _amount = 0;

    const result = await this.prisma.$transaction(
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

        _clientEmail = clientUser.email;
        _clientName = clientUser.name || 'Kliyan';

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

        const amount = validatedAmount;

        // FEES
        const totalFee =
          amount * 0.06;

        const agentCommission =
          amount * 0.02;

        const ozamaRevenue =
          amount * 0.04;

        const finalAmount =
          amount - totalFee;

        // DEBIT AGENT — kondisyon balans fè pati WHERE la menm, pa yon
        // lekti separe (menm patwon ak gift cards): sou konkirans, Postgres
        // vewouye liy lan nan UPDATE a, se yon sèl kòmand ki ka genyen.
        const debit = await tx.agentWallet.updateMany({
          where: {
            agentId: agent.id,
            balance: { gte: amount },
          },
          data: {
            balance: {
              decrement: amount,
            },
          },
        });

        if (debit.count === 0) {
          throw new BadRequestException(
            'Agent pa gen ase lajan',
          );
        }

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
              reference: `AT-${uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase()}`,

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

        _amount = amount;
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

    try {
      if (agentUser) {
        await this.mailService.sendAgentTopupConfirmed(
          _clientEmail,
          _clientName,
          agentUser.name || 'Ajans',
          _amount,
          agentUser.email,
        );
      }
    } catch {}

    return result;
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

    const agentUser = await this.prisma.user.findUnique({
      where: { id: agentUserId },
      select: { email: true, name: true },
    });

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

    // TRANSACTION
    const withdrawResult = await this.prisma.$transaction(
      async (tx) => {
        // Re-read balance inside the transaction to prevent race conditions
        const currentWallet = await tx.wallet.findUnique({
          where: { userId: clientUser.id },
        });
        if (!currentWallet || Number(currentWallet.balance) < totalDebit) {
          throw new BadRequestException('Balans kliyan an ensifizan.');
        }

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
              reference: `AW-${uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase()}`,

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
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    try {
      if (agentUser) {
        await this.mailService.sendAgentWithdrawConfirmed(
          clientUser.email,
          clientUser.name || 'Kliyan',
          agentUser.name || 'Ajans',
          amount,
          agentUser.email,
        );
      }
    } catch {}

    return withdrawResult;
  }

  async verifyAgent(agentCode: string) {
    return this.prisma.agent.findFirst({
      where: { agentCode, status: 'ACTIVE' },
      include: { user: { select: { name: true } } },
    });
  }
}