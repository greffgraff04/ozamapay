import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommissionsService {
  constructor(
    private prisma: PrismaService,
  ) {}

  // =========================
  // KYC COMMISSION
  // =========================
  async processKycCommission(
    agentCode: string,
  ) {
    const agent =
      await this.prisma.agent.findUnique({
        where: {
          agentCode,
        },
        include: {
          wallet: true,
        },
      });

    if (!agent) {
      throw new BadRequestException(
        'Invalid agent code',
      );
    }

    const commissionAmount = 3;

    await this.prisma.agentWallet.update({
      where: {
        agentId: agent.id,
      },
      data: {
        balance: {
          increment: commissionAmount,
        },
      },
    });

    await this.prisma.agent.update({
      where: {
        id: agent.id,
      },
      data: {
        totalCommission: {
          increment: commissionAmount,
        },
      },
    });

    await this.prisma.commission.create({
      data: {
        agentId: agent.id,
        type: 'KYC',
        amount: commissionAmount,
      },
    });

    return true;
  }

  // =========================
  // TOPUP COMMISSION
  // =========================
  async processTopupCommission(
    agentCode: string,
    amount: number,
  ) {
    const agent =
      await this.prisma.agent.findUnique({
        where: {
          agentCode,
        },
        include: {
          wallet: true,
        },
      });

    if (!agent) {
      throw new BadRequestException(
        'Invalid agent code',
      );
    }

    // Agent touche 2%
    const commissionAmount =
      amount * 0.02;

    await this.prisma.agentWallet.update({
      where: {
        agentId: agent.id,
      },
      data: {
        balance: {
          increment: commissionAmount,
        },
      },
    });

    await this.prisma.agent.update({
      where: {
        id: agent.id,
      },
      data: {
        totalCommission: {
          increment: commissionAmount,
        },
        totalTopupVolume: {
          increment: amount,
        },
      },
    });

    await this.prisma.commission.create({
      data: {
        agentId: agent.id,
        type: 'TOPUP',
        amount: commissionAmount,
      },
    });

    return true;
  }

  // =========================
  // WITHDRAW COMMISSION
  // =========================
  async processWithdrawalCommission(
    agentCode: string,
    amount: number,
  ) {
    const agent =
      await this.prisma.agent.findUnique({
        where: {
          agentCode,
        },
        include: {
          wallet: true,
        },
      });

    if (!agent) {
      throw new BadRequestException(
        'Invalid agent code',
      );
    }

    // Agent touche 0.75%
    const commissionAmount =
      amount * 0.0075;

    await this.prisma.agentWallet.update({
      where: {
        agentId: agent.id,
      },
      data: {
        balance: {
          increment: commissionAmount,
        },
      },
    });

    await this.prisma.agent.update({
      where: {
        id: agent.id,
      },
      data: {
        totalCommission: {
          increment: commissionAmount,
        },
        totalWithdrawalVolume: {
          increment: amount,
        },
      },
    });

    await this.prisma.commission.create({
      data: {
        agentId: agent.id,
        type: 'WITHDRAWAL',
        amount: commissionAmount,
      },
    });

    return true;
  }
}