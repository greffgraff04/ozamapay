import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateKycDto } from './dto/kyc.dto';
import { COMMISSION_AGENT_KYC } from '../common/constants';

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

        // NOTE: $25 fee is validated and debited only on admin APPROVE, not at submit time.

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

  async approveKyc(userId: string) {
    const KYC_FEE_HTG = 3375;

    return this.prisma.$transaction(async (tx) => {
      // 1. Find KYC
      const kyc = await tx.kyc.findUnique({ where: { userId } });
      if (!kyc) throw new NotFoundException('KYC introuvable');
      if (kyc.status === 'APPROVED') throw new BadRequestException('KYC deja apwouve');

      // 2. Find wallet
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) throw new NotFoundException('Wallet introuvable');

      // 3. Check balance
      if (Number(wallet.balance) < KYC_FEE_HTG) {
        throw new BadRequestException(`Balans ennsifizan. Kliyan bezwen ${KYC_FEE_HTG} HTG pou KYC`);
      }

      // 4. Debit wallet
      await tx.wallet.update({
        where: { userId },
        data: { balance: { decrement: KYC_FEE_HTG } }
      });

      // 5. Credit master wallet
      const masterId = process.env.OZAMAPAY_MASTER_ID;
      if (masterId) {
        await tx.wallet.update({
          where: { userId: masterId },
          data: { balance: { increment: KYC_FEE_HTG } }
        });
      }

      // 6. Create transaction record
      await tx.transaction.create({
        data: {
          senderWalletId: wallet.id,
          type: 'PAYMENT',
          amount: KYC_FEE_HTG,
          netAmount: KYC_FEE_HTG,
          fee: 0,
          status: 'COMPLETED',
          description: 'Frè verifikasyon KYC — $25 USD',
          reference: `KYC-FEE-${userId}-${Date.now()}`,
        }
      });

      // 7. Approve KYC
      await tx.kyc.update({
        where: { userId },
        data: { status: 'APPROVED', reviewedAt: new Date() }
      });

      // 8. Referral commission — credit referring agent if user was referred
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          referredByAgentId: true,
          referredByAgent: {
            select: {
              id: true,
              commissionRate: true,
              wallet: { select: { agentId: true } },
            },
          },
        },
      });

      const referringAgent = user?.referredByAgent;
      if (referringAgent?.wallet) {
        const agentCommission = COMMISSION_AGENT_KYC;

        // Deduct commission from master wallet (comes out of platform's cut)
        if (masterId) {
          await tx.wallet.update({
            where: { userId: masterId },
            data: { balance: { decrement: agentCommission } },
          });
        }

        // Credit agent wallet
        await tx.agentWallet.update({
          where: { agentId: referringAgent.id },
          data: { balance: { increment: agentCommission } },
        });

        // Update agent stats
        await tx.agent.update({
          where: { id: referringAgent.id },
          data: {
            totalCommission: { increment: agentCommission },
            totalKyc: { increment: 1 },
          },
        });

        // Log commission
        await tx.commission.create({
          data: {
            agentId: referringAgent.id,
            type: 'KYC',
            amount: agentCommission,
          },
        });
      }

      return { success: true, message: 'KYC apwouve ak siksè. Frè $25 debi.' };
    });
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