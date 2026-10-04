import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateKycDto, UpdateAddressDto } from './dto/kyc.dto';
import { COMMISSION_AGENT_KYC } from '../common/constants';
import { StrowalletService } from '../strowallet/strowallet.service';

@Injectable()
export class KycService {
  constructor(
    private prisma: PrismaService,
    private strowalletService: StrowalletService,
  ) {}

  async assertApproved(userId: string) {
    const kyc = await this.prisma.kyc.findUnique({ where: { userId } });

    if (!kyc) {
      throw new ForbiddenException('Ou dwe fè KYC avan');
    }

    if (kyc.status !== 'APPROVED') {
      throw new ForbiddenException(`KYC ou an ${kyc.status}`);
    }
  }

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

  // 4 oct 2026 — kont KYC APPROVED pa ka re-soumèt (gade submitKyc() pi wo),
  // men gen bezwen korije sèlman adrès (line1) yo pou cardkyc ka pase (wè
  // StrowalletService.isAddressTooShort()). Si yon demand kreyasyon kat te
  // bloke pou menm rezon an (CardCreationAddressBlock), relanse l
  // otomatikman — kliyan an pa bezwen refè okenn demand/peman.
  async applyCorrectedAddress(userId: string, dto: UpdateAddressDto) {
    const kyc = await this.prisma.kyc.findUnique({ where: { userId } });
    if (!kyc) throw new NotFoundException('KYC introuvable');
    if (kyc.status !== 'APPROVED') {
      throw new BadRequestException(`KYC ou an ${kyc.status} — adrès la ka korije sèlman apre KYC apwouve`);
    }
    if (this.strowalletService.isAddressTooShort(dto.line1)) {
      throw new BadRequestException(
        `Adrès la toujou twò kout (minimòm ${this.strowalletService.MIN_ADDRESS_LENGTH} karaktè) — tanpri bay plis detay (non lari, nimewo, katye).`,
      );
    }

    const updatedKyc = await this.prisma.kyc.update({
      where: { userId },
      data: {
        line1: dto.line1,
        ...(dto.city !== undefined ? { city: dto.city } : {}),
        ...(dto.state !== undefined ? { state: dto.state } : {}),
        ...(dto.zipCode !== undefined ? { zipCode: dto.zipCode } : {}),
        ...(dto.country !== undefined ? { country: dto.country } : {}),
      },
    });

    const block = await this.prisma.cardCreationAddressBlock.findFirst({
      where: { userId, resolvedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!block) {
      return { success: true, message: 'Adrès mete ajou avèk siksè.', kyc: updatedKyc };
    }

    let cardCreationResult: unknown = null;
    let resumeError: string | null = null;
    try {
      cardCreationResult = block.context === 'REPLACEMENT'
        ? await this.strowalletService.createReplacementCard(userId, Number(block.amountUsd), block.oldCardId ?? undefined, 0)
        : await this.strowalletService.createAndFundCard(userId, Number(block.amountUsd));
    } catch (err: any) {
      resumeError = err?.message ?? 'Erè enkoni pandan relans kreyasyon kat la';
    }

    await this.prisma.cardCreationAddressBlock.update({ where: { id: block.id }, data: { resolvedAt: new Date() } });

    return {
      success: true,
      message: resumeError
        ? `Adrès mete ajou, men kreyasyon kat la echwe pou yon lòt rezon: ${resumeError}`
        : 'Adrès mete ajou e kreyasyon kat la relanse otomatikman.',
      kyc: updatedKyc,
      cardCreationResult,
    };
  }
}