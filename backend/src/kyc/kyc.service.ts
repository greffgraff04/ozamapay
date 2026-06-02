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