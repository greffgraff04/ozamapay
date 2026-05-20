import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKycDto } from './dto/kyc.dto'; // Asire w chimen sa a kòrèk selon kote DTO w la ye

@Injectable()
export class KycService {
  constructor(private prisma: PrismaService) {}

  async submitKyc(userId: string, dto: CreateKycDto) {
    // 🌟 KOREKSYON: kYC vin kyc
    const existing = await this.prisma.kyc.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new BadRequestException('Ou deja soumèt KYC ou a');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Tcheke Taux USD_HTG
      const rateEntry = await tx.rate.findUnique({ where: { key: 'USD_HTG' } });
      const currentRate = rateEntry ? rateEntry.value : 140; 
      const KYC_FEE_USD = 25;
      const feeInHTG = KYC_FEE_USD * currentRate;

      // 2. Tcheke Wallet
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) throw new BadRequestException('Bous pa jwenn');

      if (Number(wallet.balance) < feeInHTG) {
        throw new BadRequestException(`Ou bezwen ${feeInHTG} HTG ($25) pou KYC.`);
      }

      // 3. Pran kòb la epi kreye Ledger
      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: { balance: { decrement: feeInHTG } },
      });

      const transaction = await tx.transaction.create({
        data: {
          reference: `KYC-${Date.now()}`,
          amount: feeInHTG,
          netAmount: feeInHTG,
          type: 'PAYMENT',
          status: 'COMPLETED',
          title: 'Frè KYC',
          description: `Peman $25 (Taux: ${currentRate})`,
          senderWalletId: wallet.id,
        },
      });

      await tx.ledgerEntry.create({
        data: {
          walletId: wallet.id,
          transactionId: transaction.id,
          type: 'DEBIT',
          amount: feeInHTG,
          balanceBefore: wallet.balance,
          balanceAfter: updatedWallet.balance,
        },
      });

      // 4. Kreye KYC a ak nouvo chan dinamik yo pou StroWallet
      return tx.kyc.create({
        data: {
          userId,
          firstName: dto.firstName,
          lastName: dto.lastName,
          dateOfBirth: new Date(dto.dateOfBirth), // Konvèti an DateTime pou Prisma
          phoneNumber: dto.phoneNumber,
          idType: dto.idType,
          idNumber: dto.idNumber,
          idImage: dto.idImage,
          userPhoto: dto.userPhoto,
          line1: dto.line1,
          city: dto.city,
          state: dto.state,
          zipCode: dto.zipCode,
          country: dto.country,
          status: 'PENDING',
        },
      });
    });
  }

  async getKycStatus(userId: string) {
    const kyc = await this.prisma.kyc.findUnique({
      where: { userId },
    });
    if (!kyc) throw new NotFoundException('KYC pa jwenn');
    return kyc;
  }

  async approveKyc(userId: string) {
    return this.prisma.kyc.update({
      where: { userId },
      data: { 
        status: 'APPROVED',
        reviewedAt: new Date()
      },
    });
  }

  async rejectKyc(userId: string) {
    return this.prisma.kyc.update({
      where: { userId },
      data: { 
        status: 'REJECTED',
        reviewedAt: new Date()
      },
    });
  }
}