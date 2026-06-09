import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  /**
   * 1. RALE PROFIL AJAN AN POU DASHBOARD LI
   * Rale Agent, AgentWallet (wallet), ak enfòmasyon User ki lye a
   */
  async getAgentProfile(userId: any) {
    const stringUserId = String(userId);

    const agent = await this.prisma.agent.findUnique({
      where: { userId: stringUserId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
            role: true,
          },
        },
        wallet: true, // Rale AgentWallet otomatikman
      },
    });

    if (!agent) {
      throw new BadRequestException("Profil Ajan sa a pa egziste nan sistèm nan.");
    }

    return {
      success: true,
      agentCode: agent.agentCode,
      businessName: agent.businessName || "Ozama Agent",
      status: agent.status,
      level: agent.level,
      trustScore: Number(agent.trustScore),
      commissionRate: Number(agent.commissionRate),
      dailyLimit: Number(agent.dailyLimit),
      agentBalance: agent.wallet?.balance ? Number(agent.wallet.balance) : 0.00, 
      commissions: agent.totalCommission ? Number(agent.totalCommission) : 0.00,
      totalTopupVolume: Number(agent.totalTopupVolume),
      totalWithdrawalVolume: Number(agent.totalWithdrawalVolume),
      totalKyc: agent.totalKyc,
      name: agent.user.name,
      email: agent.user.email,
    };
  }

  /**
   * 2. RECHARGE KONT AJAN LI MENM (0% FRAIS)
   * Ogmante balans ki nan AgentWallet la dirèkteman san pran okenn frè
   */
  async agentSelfTopup(userId: any, amount: number) {
    const stringUserId = String(userId);
    const topupAmount = Number(amount);

    if (topupAmount <= 0) {
      throw new BadRequestException("Kantite kòb la dwe pi gwo pase 0.");
    }

    return await this.prisma.$transaction(async (tx) => {
      const agent = await tx.agent.findUnique({
        where: { userId: stringUserId },
        include: { wallet: true }
      });

      if (!agent) {
        throw new BadRequestException("Ajan sa a pa egziste.");
      }

      if (!agent.wallet) {
        throw new BadRequestException("Ajan sa a pa gen yon bous (AgentWallet) ki aktive.");
      }

      const updatedWallet = await tx.agentWallet.update({
        where: { id: agent.wallet.id },
        data: {
          balance: {
            increment: topupAmount,
          },
        },
      });

      await tx.agent.update({
        where: { id: agent.id },
        data: {
          totalTopupVolume: {
            increment: topupAmount,
          }
        }
      });

      return {
        success: true,
        message: `Kont ajan ou rechaje ak ${topupAmount} HTG avèk siksè (0% Frais)!`,
        newBalance: Number(updatedWallet.balance),
      };
    });
  }

  /**
   * 3. KREYE OSOVA METE AJOU PIN TRANZAKSYON KLIYAN AN
   * Sove kòd PIN 4 a 6 chif la pou sekirize kont lan kont move retrè
   */
  async updateTransactionPin(userId: any, newPin: string) {
    const stringUserId = String(userId);

    if (!/^\d{4,6}$/.test(newPin)) {
      throw new BadRequestException("PIN nan dwe gen ant 4 a 6 chif sèlman (chif sèlman).");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: stringUserId },
    });

    if (!user) {
      throw new BadRequestException("Itilizatè sa a pa egziste.");
    }

    await this.prisma.user.update({
      where: { id: stringUserId },
      data: {
        transactionPin: await bcrypt.hash(newPin, 10),
      },
    });

    return {
      success: true,
      message: "PIN tranzaksyon ou mete ajou ak siksè!",
    };
  }

  async updateProfile(userId: string, data: { name?: string; phone?: string }) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.phone && { phone: data.phone }),
      },
      select: { id: true, name: true, phone: true, email: true },
    });
    return { success: true, ...updated };
  }

  async updateProfilePhoto(userId: string, photoUrl: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { photoUrl },
    });
    return { success: true, photoUrl };
  }
}