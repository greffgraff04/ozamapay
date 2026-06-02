import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KYCStatus } from '@prisma/client';
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

  /**
   * 4. SOUMÈT KYC AVÈK TRANZAKSYON ATOMIK (INDESTRUCTIBLE)
   * Si kreyasyon KYC a planté, lajan an AP TOUNEN nan bous la otomatikman!
   */
  async submitKyc(
    userId: any,
    idType: string,
    idNumber: string,
    files: { idCardFile?: any[]; userPhotoFile?: any[] },
    additionalData?: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      phoneNumber?: string;
      line1?: string;
      address?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
      dateOfBirth?: string;
    }
  ) {
    const stringUserId = String(userId);

    // Verify user & wallet read-only anvan tranzaksyon an kòmanse
    const user = await this.prisma.user.findUnique({
      where: { id: stringUserId },
    });

    if (!user) {
      throw new BadRequestException('Itilizatè sa a pa egziste nan sistèm nan.');
    }

    const wallet = await this.prisma.wallet.findFirst({
      where: { userId: stringUserId },
    });

    if (!wallet) {
      throw new BadRequestException('Itilizatè sa a pa gen yon bous.');
    }

    // Safely extract paths
    const idCardPath =
      files?.idCardFile?.[0]?.path ||
      files?.idCardFile?.[0]?.filename ||
      `uploads/id_card_${Date.now()}.jpg`;

    const userPhotoPath =
      files?.userPhotoFile?.[0]?.path ||
      files?.userPhotoFile?.[0]?.filename ||
      `uploads/user_photo_${Date.now()}.jpg`;

    const kycCostHtg = 3375;
    const balanceAsNumber = Number(wallet.balance);

    if (balanceAsNumber < kycCostHtg) {
      throw new BadRequestException('Balans ou pa ase pou fè verifikasyon sa a.');
    }

    // Data Mapping
    const finalFirstName = additionalData?.firstName || user.name?.split(' ')[0] || 'Client';
    const finalLastName = additionalData?.lastName || user.name?.split(' ')[1] || 'Ozama';
    const finalPhone = additionalData?.phoneNumber || additionalData?.phone || user.phone || '50933333333';
    const finalIdType = idType || 'PASSPORT';
    const finalIdNumber = idNumber || '000000';
    const finalLine1 = additionalData?.line1 || additionalData?.address || 'Haiti';
    const finalCity = additionalData?.city || 'Port-au-Prince';
    const finalState = additionalData?.state || 'Ouest';
    const finalZipCode = additionalData?.zipCode || '6110';
    const finalCountry = additionalData?.country || 'HT';
    const rawDate = additionalData?.dateOfBirth || '1995-01-01';

    const existing = await this.prisma.kyc.findFirst({
      where: { userId: stringUserId },
    });

    const kycPayload = {
      status: KYCStatus.PENDING,
      firstName: finalFirstName,
      lastName: finalLastName,
      phoneNumber: finalPhone,
      idType: finalIdType,
      idNumber: finalIdNumber,
      idImage: idCardPath,     
      userPhoto: userPhotoPath, 
      line1: finalLine1,
      city: finalCity,
      state: finalState,
      zipCode: finalZipCode,
      country: finalCountry,
      dateOfBirth: new Date(rawDate),
    };

    // LANSE TRANZAKSYON AN ⚡
    try {
      const resultBalance = await this.prisma.$transaction(async (tx) => {
        
        // A. Update user profile inside tx
        await tx.user.update({
          where: { id: stringUserId },
          data: {
            name: `${finalFirstName} ${finalLastName}`,
            phone: finalPhone,
          },
        });

        // B. Debit client wallet inside tx
        const updatedWallet = await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: {
              decrement: kycCostHtg,
            },
          },
        });

        // C. Create or update KYC record inside tx
        if (existing) {
          await tx.kyc.update({
            where: { id: existing.id },
            data: kycPayload,
          });
        } else {
          await tx.kyc.create({
            data: {
              userId: stringUserId,
              ...kycPayload,
            },
          });
        }

        return updatedWallet.balance;
      });

      return {
        success: true,
        message: 'KYC soumèt epi pwofil ou mete ajou ak siksè!',
        status: KYCStatus.PENDING,
        newBalance: Number(resultBalance),
      };

    } catch (txError) {
      console.error("🚨 [TRANSACTION ROLLBACK EXECUTED]:", txError);
      throw new BadRequestException(
        "Tranzaksyon an echwe. Done yo gen fòma ki pa kòrèk. Lajan ou pa debite.",
      );
    }
  }

  // GET ALL PENDING KYC
  async getPendingKyc() {
    return await this.prisma.kyc.findMany({
      where: { status: KYCStatus.PENDING },
      orderBy: { createdAt: 'desc' },
    });
  }

  // REVIEW KYC BY ADMIN / AGENT
  async reviewKyc(userId: any, action: 'APPROVE' | 'REJECT') {
    const stringUserId = String(userId);

    const kyc = await this.prisma.kyc.findFirst({
      where: { userId: stringUserId },
    });

    if (!kyc) {
      throw new BadRequestException('Pa gen okenn aplikasyon KYC ki jwenn.');
    }

    const newStatus = action === 'APPROVE' ? KYCStatus.APPROVED : KYCStatus.REJECTED;

    await this.prisma.kyc.update({
      where: { id: kyc.id },
      data: { status: newStatus },
    });

    return {
      success: true,
      message: `KYC itilizatè a pase nan statu ${newStatus} ak siksè!`,
      status: newStatus,
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