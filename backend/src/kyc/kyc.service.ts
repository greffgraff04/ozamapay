import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateKycDto } from './dto/kyc.dto';

import { CommissionsService } from '../commissions/commissions.service';

@Injectable()
export class KycService {
  constructor(
    private prisma: PrismaService,

    private commissionsService: CommissionsService,
  ) {}

  async submitKyc(
    userId: string,
    dto: CreateKycDto,
  ) {
    const existing =
      await this.prisma.kyc.findUnique({
        where: { userId },
      });

    if (existing) {
      throw new BadRequestException(
        'Ou deja soumèt KYC ou a',
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        // 🔥 User referral lookup
        const user =
          await tx.user.findUnique({
            where: {
              id: userId,
            },
          });

        const rateEntry =
          await tx.rate.findUnique({
            where: {
              key: 'USD_HTG',
            },
          });

        const currentRate = rateEntry
          ? rateEntry.value
          : 140;

        const KYC_FEE_USD = 25;

        const feeInHTG =
          KYC_FEE_USD *
          Number(currentRate);

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

        // 🔥 Debit wallet
        const updatedWallet =
          await tx.wallet.update({
            where: { userId },

            data: {
              balance: {
                decrement:
                  feeInHTG,
              },
            },
          });

        // 🔥 Transaction
        const transaction =
          await tx.transaction.create({
            data: {
              reference: `KYC-${Date.now()}`,

              amount: feeInHTG,

              netAmount: feeInHTG,

              type: 'PAYMENT',

              status: 'COMPLETED',

              title: 'Frè KYC',

              description: `Peman $25 (Taux: ${currentRate})`,

              senderWalletId:
                wallet.id,
            },
          });

        // 🔥 Ledger
        await tx.ledgerEntry.create({
          data: {
            walletId: wallet.id,

            transactionId:
              transaction.id,

            type: 'DEBIT',

            amount: feeInHTG,

            balanceBefore:
              wallet.balance,

            balanceAfter:
              updatedWallet.balance,
          },
        });

        // 🔥 Create KYC
        return tx.kyc.create({
          data: {
            userId,

            // 🔥 Auto agent attach
            agentId:
              user?.referredByAgentId ||
              null,

            firstName:
              dto.firstName,

            lastName:
              dto.lastName,

            dateOfBirth:
              new Date(
                dto.dateOfBirth,
              ),

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

            line1: dto.line1,

            city: dto.city,

            state: dto.state,

            zipCode:
              dto.zipCode,

            country:
              dto.country,

            status: 'PENDING',
          },
        });
      },
    );
  }

  async getKycStatus(userId: string) {
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

  async approveKyc(userId: string) {
    const kyc =
      await this.prisma.kyc.update({
        where: { userId },

        data: {
          status: 'APPROVED',

          reviewedAt: new Date(),
        },
      });

    // 🔥 Commission agent seulement après APPROVAL
    if (kyc.agentId) {
      const agent =
        await this.prisma.agent.findUnique(
          {
            where: {
              id: kyc.agentId,
            },
          },
        );

      if (agent) {
        await this.commissionsService.processKycCommission(
          agent.agentCode,
        );
      }
    }

    return kyc;
  }

  async rejectKyc(userId: string) {
    return this.prisma.kyc.update({
      where: { userId },

      data: {
        status: 'REJECTED',

        reviewedAt: new Date(),
      },
    });
  }
}