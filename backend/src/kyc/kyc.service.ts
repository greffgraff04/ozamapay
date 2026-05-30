import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateKycDto } from './dto/kyc.dto';

@Injectable()
export class KycService {
  constructor(
    private prisma: PrismaService,
  ) {}

  async submitKyc(
    userId: string,
    dto: CreateKycDto,
  ) {
    if (!dto) {
      throw new BadRequestException(
        'Done KYC yo pa rive nan backend la',
      );
    }

    const existing =
      await this.prisma.kyc.findUnique({
        where: { userId },
      });

    if (existing && existing.status !== 'REJECTED') {
      throw new BadRequestException(
        'Ou deja soumèt KYC ou a',
      );
    }

    if (existing && existing.status === 'REJECTED') {
      await this.prisma.kyc.delete({ where: { userId } });
    }

    return this.prisma.$transaction(
      async (tx) => {
        // =========================
        // USER
        // =========================
        const user =
          await tx.user.findUnique({
            where: {
              id: userId,
            },
          });

        if (!user) {
          throw new NotFoundException(
            'User pa jwenn',
          );
        }

        // =========================
        // DATE VALIDATION
        // =========================
        const parsedDate =
          new Date(dto.dateOfBirth);

        if (
          isNaN(parsedDate.getTime())
        ) {
          throw new BadRequestException(
            'Dat nesans lan pa valide',
          );
        }

        // =========================
        // RATE
        // =========================
        const rateEntry =
          await tx.rate.findUnique({
            where: {
              key: 'USD_HTG',
            },
          });

        const currentRate =
          Number(rateEntry?.value || 140);

        const KYC_FEE_USD = 25;

        const feeInHTG =
          KYC_FEE_USD *
          currentRate;

        // =========================
        // USER WALLET
        // =========================
        const wallet =
          await tx.wallet.findUnique({
            where: { userId },
          });

        if (!wallet) {
          throw new BadRequestException(
            'Bous pa jwenn',
          );
        }

        if (
          Number(wallet.balance) <
          feeInHTG
        ) {
          throw new BadRequestException(
            `Ou bezwen ${feeInHTG} HTG ($25) pou KYC.`,
          );
        }

        // =========================
        // CREATE KYC
        // =========================
        const createdKyc =
          await tx.kyc.create({
            data: {
              userId,

              agentId:
                user.referredByAgentId ||
                null,

              firstName:
                dto.firstName,

              lastName:
                dto.lastName,

              dateOfBirth:
                parsedDate,

              phoneNumber:
                dto.phoneNumber,

              idType:
                dto.idType,

              idNumber:
                dto.idNumber,

              idImage:
                dto.idImage,

              userPhoto:
                dto.userPhoto,

              line1:
                dto.line1,

              city:
                dto.city,

              state:
                dto.state,

              zipCode:
                dto.zipCode,

              country:
                dto.country,

              status: 'PENDING',
            },
          });

        // =========================
        // AGENT COMMISSION
        // =========================
        if (
          user.referredByAgentId
        ) {
          const agent =
            await tx.agent.findUnique({
              where: {
                id: user.referredByAgentId,
              },

              include: {
                wallet: true,
              },
            });

          if (
            agent &&
            agent.wallet
          ) {
            // =========================
            // COMMISSION
            // =========================
            const commissionHTG =
              3 * currentRate;

            // =========================
            // CREDIT AGENT WALLET
            // =========================
            const updatedAgentWallet =
              await tx.agentWallet.update(
                {
                  where: {
                    agentId:
                      agent.id,
                  },

                  data: {
                    balance: {
                      increment:
                        commissionHTG,
                    },
                  },
                },
              );

            // =========================
            // UPDATE AGENT STATS
            // =========================
            await tx.agent.update({
              where: {
                id: agent.id,
              },

              data: {
                totalCommission: {
                  increment:
                    commissionHTG,
                },

                totalKyc: {
                  increment: 1,
                },
              },
            });

            // =========================
            // SAVE COMMISSION
            // =========================
            await tx.commission.create({
              data: {
                agentId:
                  agent.id,

                amount:
                  commissionHTG,

                type: 'KYC',
              },
            });

            // =========================
            // IMPORTANT FIX 🔥
            // =========================
            // receiverWalletId bezwen
            // wallet.id USER wallet table
            // pa agentWallet.id
            // sinon foreign key crash
            // =========================

            const agentUserWallet =
              await tx.wallet.findUnique(
                {
                  where: {
                    userId:
                      agent.userId,
                  },
                },
              );

            if (!agentUserWallet) {
              throw new BadRequestException(
                'Wallet user agent pa jwenn',
              );
            }

            // =========================
            // AGENT TRANSACTION
            // =========================
            const agentTransaction =
              await tx.transaction.create(
                {
                  data: {
                    reference: `AGENT-KYC-${Date.now()}`,

                    amount:
                      commissionHTG,

                    netAmount:
                      commissionHTG,

                    type:
                      'PAYMENT',

                    status:
                      'COMPLETED',

                    title:
                      'Komisyon KYC',

                    description:
                      'Komisyon agent apre KYC',

                    receiverWalletId:
                      agentUserWallet.id,
                  },
                },
              );

            // =========================
            // AGENT LEDGER
            // =========================
            await tx.ledgerEntry.create({
              data: {
                walletId:
                  agentUserWallet.id,

                transactionId:
                  agentTransaction.id,

                type: 'CREDIT',

                amount:
                  commissionHTG,

                balanceBefore:
                  agent.wallet.balance,

                balanceAfter:
                  updatedAgentWallet.balance,
              },
            });
          }
        }

        return {
          success: true,

          message:
            'KYC soumèt avèk siksè',

          data: createdKyc,
        };
      },
    );
  }

  async getKycStatus(
    userId: string,
  ) {
    const kyc =
      await this.prisma.kyc.findUnique({
        where: { userId },
      });

    if (!kyc) {
      throw new NotFoundException(
        'KYC pa jwenn',
      );
    }

    return kyc;
  }

  async approveKyc(
    userId: string,
  ) {
    const kyc =
      await this.prisma.kyc.update({
        where: { userId },

        data: {
          status: 'APPROVED',

          reviewedAt: new Date(),
        },
      });

    return {
      success: true,

      message:
        'KYC apwouve avèk siksè',

      data: kyc,
    };
  }

  async rejectKyc(
    userId: string,
  ) {
    const kyc =
      await this.prisma.kyc.update({
        where: { userId },

        data: {
          status: 'REJECTED',

          reviewedAt: new Date(),
        },
      });

    return {
      success: true,

      message:
        'KYC rejte',

      data: kyc,
    };
  }
}