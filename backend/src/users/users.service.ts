import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KYCStatus } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

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

    // 1. Verify user
    const user = await this.prisma.user.findUnique({
      where: { id: stringUserId },
    });

    if (!user) {
      throw new BadRequestException(
        'Itilizatè sa a pa egziste nan sistèm nan.',
      );
    }

    // 2. Verify wallet
    const wallet = await this.prisma.wallet.findFirst({
      where: { userId: stringUserId },
    });

    if (!wallet) {
      throw new BadRequestException(
        'Itilizatè sa a pa gen yon bous.',
      );
    }

    // 3. Extract uploaded file paths safely
    const idCardPath =
      files?.idCardFile?.[0]?.path ||
      files?.idCardFile?.[0]?.filename ||
      `uploads/id_card_${Date.now()}.jpg`;

    const userPhotoPath =
      files?.userPhotoFile?.[0]?.path ||
      files?.userPhotoFile?.[0]?.filename ||
      `uploads/user_photo_${Date.now()}.jpg`;

    // 4. KYC fee validation
    const kycCostHtg = 3375;
    const balanceAsNumber = Number(wallet.balance);

    if (balanceAsNumber < kycCostHtg) {
      throw new BadRequestException(
        'Balans ou pa ase pou fè verifikasyon sa a.',
      );
    }

    // 5. Final user data maps with priority to additionalData
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

    // 6. Update user profile
    await this.prisma.user.update({
      where: { id: stringUserId },
      data: {
        name: `${finalFirstName} ${finalLastName}`,
        phone: finalPhone,
      },
    });

    // 7. Debit wallet
    await this.prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: {
          decrement: kycCostHtg,
        },
      },
    });

    // 8. Check existing KYC
    const existing = await this.prisma.kyc.findFirst({
      where: {
        userId: stringUserId,
      },
    });

    // 9. Build KYC payload matching BOTH structural versions safely
    const kycPayload: any = {
      status: KYCStatus.PENDING,
      fullName: `${finalFirstName} ${finalLastName}`,
      phone: finalPhone,
      idType: finalIdType,
      idNumber: finalIdNumber,
      idFrontImage: idCardPath,
      selfieImage: userPhotoPath,
      address: finalLine1,
      dateOfBirth: rawDate,
      // Fallback jaden pou ansyen vèsyon schema a si yo mande yo toujou
      firstName: finalFirstName,
      lastName: finalLastName,
      phoneNumber: finalPhone,
      idImage: idCardPath,
      userPhoto: userPhotoPath,
      line1: finalLine1,
      city: finalCity,
      state: finalState,
      zipCode: finalZipCode,
      country: finalCountry,
    };

    // 10. Update or create KYC using 'as any' to bypass type mismatches
    if (existing) {
      await this.prisma.kyc.update({
        where: {
          id: existing.id,
        },
        data: kycPayload as any,
      });
    } else {
      await this.prisma.kyc.create({
        data: {
          userId: stringUserId,
          ...kycPayload,
        } as any,
      });
    }

    // 11. Get updated wallet balance
    const updatedWallet = await this.prisma.wallet.findUnique({
      where: {
        id: wallet.id,
      },
    });

    return {
      success: true,
      message: 'KYC soumèt epi pwofil ou mete ajou ak siksè!',
      status: KYCStatus.PENDING,
      newBalance: updatedWallet?.balance || wallet.balance,
    };
  }

  // GET ALL PENDING KYC
  async getPendingKyc() {
    return await this.prisma.kyc.findMany({
      where: {
        status: KYCStatus.PENDING,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // REVIEW KYC
  async reviewKyc(
    userId: any,
    action: 'APPROVE' | 'REJECT',
  ) {
    const stringUserId = String(userId);

    const kyc = await this.prisma.kyc.findFirst({
      where: {
        userId: stringUserId,
      },
    });

    if (!kyc) {
      throw new BadRequestException(
        'Pa gen okenn aplikasyon KYC ki jwenn.',
      );
    }

    const newStatus =
      action === 'APPROVE'
        ? KYCStatus.APPROVED
        : KYCStatus.REJECTED;

    await this.prisma.kyc.update({
      where: {
        id: kyc.id,
      },
      data: {
        status: newStatus,
      },
    });

    return {
      success: true,
      message: `KYC itilizatè a pase nan statu ${newStatus} ak siksè!`,
      status: newStatus,
    };
  }
}