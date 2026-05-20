import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid'; // Si pakè a la, sinon n ap itilize yon random string sekirite

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async submitKyc(userId: any, idType: string, idNumber: string, files: { idCardFile?: any[], userPhotoFile?: any[] }) {
    const stringUserId = String(userId);

    // 1. Jwenn itilizatè a
    const user = await this.prisma.user.findUnique({
      where: { id: stringUserId },
    });
    if (!user) throw new BadRequestException('Itilizatè sa a pa egziste');

    // 2. Jwenn wallet la
    const wallet = await this.prisma.wallet.findFirst({
      where: { userId: stringUserId },
    });
    if (!wallet) throw new BadRequestException('Itilizatè sa a pa gen yon bous (wallet) ki asosye.');

    if (!files.idCardFile || !files.userPhotoFile || files.idCardFile.length === 0 || files.userPhotoFile.length === 0) {
      throw new BadRequestException('Ou dwe voye tou de foto yo: Pyès Idantite ak Selfie w.');
    }

    const kycCostHtg = 3375; // $25 USD an Gourdes
    const currentBalance = Number(wallet.balance);

    if (currentBalance < kycCostHtg) {
      const manke = kycCostHtg - currentBalance;
      throw new BadRequestException(
        `Balans ou pa ase. Verifikasyon an koute 3,375 HTG ($25 USD). Ou gen ${currentBalance} HTG, ou manke ${manke} HTG. Tanpri ajoute kòb sou kont ou.`
      );
    }

    const idCardPath = files.idCardFile[0].path;
    const userPhotoPath = files.userPhotoFile[0].path;

    // 3. Jwenn modèl kyc a dinamikman nan Prisma (pou evite pwoblèm ti lèt oswa gwo lèt)
    const kycModel = (this.prisma as any).kyc || (this.prisma as any).kYC || (this.prisma as any).Kyc;
    
    if (!kycModel) {
      throw new BadRequestException('Modèl KYC a pa jwenn nan Prisma Client la. Verifye schema.prisma ou.');
    }

    // Tcheke si yon dosye KYC te deja la pou itilizatè sa a
    const existingKyc = await kycModel.findFirst({
      where: { userId: stringUserId },
    });

    // Kreye yon ID UUID mannyèl pou si tab la pa gen auto-generate
    const newKycId = crypto.randomUUID ? crypto.randomUUID() : `kyc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 4. Tranzaksyon pou debite wallet la epi kreye/modifye KYC a
    await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: kycCostHtg } },
      }),
      existingKyc 
        ? kycModel.update({
            where: { id: existingKyc.id },
            data: { 
              status: 'PENDING', 
              idType, 
              idNumber, 
              idCardUrl: idCardPath, 
              userPhotoUrl: userPhotoPath 
            },
          })
        : kycModel.create({
            data: { 
              id: newKycId, // Nou bay yon ID string/UUID pou si l t ap crash sou sa
              userId: stringUserId, 
              status: 'PENDING', 
              idType, 
              idNumber, 
              idCardUrl: idCardPath, 
              userPhotoUrl: userPhotoPath 
            },
          }),
    ]);

    const updatedWallet = await this.prisma.wallet.findUnique({ where: { id: wallet.id } });

    return {
      message: 'KYC soumèt ak siksè, kont ou debite $25 USD (3,375 HTG)',
      status: 'PENDING',
      newBalance: updatedWallet?.balance,
    };
  }

  async getPendingKyc() {
    const kycModel = (this.prisma as any).kyc || (this.prisma as any).kYC || (this.prisma as any).Kyc;
    if (!kycModel) return [];
    try {
      return await kycModel.findMany({
        where: { status: 'PENDING' },
        include: { user: true },
      });
    } catch {
      return [];
    }
  }

  async reviewKyc(userId: any, action: 'APPROVE' | 'REJECT') {
    const stringUserId = String(userId);
    const status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    const kycModel = (this.prisma as any).kyc || (this.prisma as any).kYC || (this.prisma as any).Kyc;

    if (!kycModel) throw new BadRequestException('Modèl KYC pa jwenn.');

    try {
      const kycRecord = await kycModel.findFirst({
        where: { userId: stringUserId },
      });

      if (!kycRecord) throw new BadRequestException('Dosye KYC sa a pa egziste.');

      await kycModel.update({
        where: { id: kycRecord.id },
        data: { status },
      });
    } catch (e) {
      throw new BadRequestException('Enposib pou mete estati a ajou.');
    }

    return { message: `KYC sa a pase nan statu: ${status}` };
  }
}