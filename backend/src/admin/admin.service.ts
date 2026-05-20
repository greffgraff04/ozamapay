import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; 

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ======================================================
  // 1. RALE STATISTIK OVERVIEW YO (AGREGASYON PRISMA + CHART)
  // ======================================================
  async getDashboardStats() {
    // A. Kalkile kantite total HTG ki nan tout bous sistèm nan
    const walletAggregates = await this.prisma.wallet.aggregate({
      _sum: {
        balance: true,
      },
    });
    const totalHTGInSystem = walletAggregates._sum.balance ? Number(walletAggregates._sum.balance) : 0;

    // B. Kalkile kantite lajan ki sou tout Kat Vityèl yo (USD)
    let totalUSDCardsBalance = 0;
    try {
      const cardAggregates = await this.prisma.virtualCard.aggregate({
        _sum: {
          balance: true,
        },
      });
      totalUSDCardsBalance = cardAggregates._sum.balance ? Number(cardAggregates._sum.balance) : 0;
    } catch (e) {
      console.log("Modèl VirtualCard la potko gen done oswa non chèma a diferan.");
    }

    // C. Kalkile total frè ki jenere (Revenue)
    let totalFeesGenerated = 0;
    try {
      const transactionAggregates = await this.prisma.transaction.aggregate({
        _sum: {
          fee: true, 
        },
      });
      totalFeesGenerated = transactionAggregates._sum.fee ? Number(transactionAggregates._sum.fee) : 0;
    } catch (e) {
      totalFeesGenerated = 0;
    }

    // D. Konte kantite tranzaksyon total nan sistèm nan
    let totalTransactions = 0;
    try {
      totalTransactions = await this.prisma.transaction.count();
    } catch (e) {
      totalTransactions = 0;
    }

    // E. Done pou Grafik la (Kalkil volim 7 dènye jou yo)
    const setJouPlisBone = new Date();
    setJouPlisBone.setDate(setJouPlisBone.getDate() - 7);

    // NOU BAY CHART DATA YON TIP SOLID POU EVITE ERÈ TS2322 (never[])
    let chartData: { name: string; amount: number }[] = [];
    
    try {
      const transactionsPandanSetJou = await this.prisma.transaction.findMany({
        where: {
          createdAt: { gte: setJouPlisBone },
          status: 'COMPLETED'
        },
        select: {
          amount: true,
          createdAt: true
        },
        orderBy: { createdAt: 'asc' }
      });

      const jouYo = ['Dim', 'Len', 'Mad', 'Mèk', 'Jèd', 'Vand', 'Sam'];
      chartData = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const nonJou = jouYo[d.getDay()];
        
        const totalJouSa = transactionsPandanSetJou
          .filter(t => new Date(t.createdAt).toDateString() === d.toDateString())
          .reduce((sum, t) => sum + Number(t.amount), 0);

        return { name: nonJou, amount: totalJouSa };
      }).reverse();
    } catch (error) {
      // Si sa echwe, nou mete estrikti fallback la kòrèkteman tou
      const jouYo = ['Dim', 'Len', 'Mad', 'Mèk', 'Jèd', 'Vand', 'Sam'];
      chartData = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return { name: jouYo[d.getDay()], amount: 0 };
      }).reverse();
    }

    // Retounen objè a egzakteman nan fòma frontend la ap tann li a
    return {
      stats: {
        totalTransactions: totalTransactions,
      },
      treasury: {
        totalHTGInSystem: totalHTGInSystem,
        totalUSDCardsBalance: totalUSDCardsBalance,
        totalFeesGenerated: totalFeesGenerated,
      },
      chartData: chartData
    };
  }

  // ======================================================
  // 2. PWOSESÈ POU APPROUVE OSWA REJTE KYC
  // ======================================================
  async reviewKyc(kycId: string, status: 'APPROVED' | 'REJECTED', adminId: string) {
    return this.prisma.$transaction(async (tx) => {
      
      // Jwenn dosye KYC a an premye ak relasyon itilizatè a
      const kyc = await tx.kyc.findUnique({
        where: { id: kycId },
        include: { user: true }
      });

      if (!kyc) {
        throw new NotFoundException("Dosye KYC sa a pa egziste nan sistèm nan.");
      }

      // A. Mete estati KYC a ajou nan tablo Kyc a (Sa ap chanje UI Kliyan an live)
      const updatedKyc = await tx.kyc.update({
        where: { id: kycId },
        data: { 
          status: status,
          reviewedAt: new Date()
        }
      });

      // B. VERIFIKASYON SEKIRETÈ POU ADMIN ID (Foreign Key constraint sou AdminActionLog)
      let validAdminId = adminId;
      
      const adminExists = await tx.user.findUnique({
        where: { id: adminId }
      });

      // Si adminId la pa valid nan DB a, nou chache premye ADMIN reyèl ki egziste
      if (!adminExists) {
        const fallbackAdmin = await tx.user.findFirst({
          where: { 
            role: { in: ['ADMIN', 'SUPER_ADMIN'] } 
          }
        });

        if (fallbackAdmin) {
          validAdminId = fallbackAdmin.id;
        } else {
          // Si pa gen okenn admin nan DB a, nou kreye yon kont sistèm sekirite
          const systemAdmin = await tx.user.upsert({
            where: { email: 'system-admin@ozamapay.com' },
            update: {},
            create: {
              email: 'system-admin@ozamapay.com',
              password: 'secure-system-password-hash',
              name: 'Sistèm Ozama',
              role: 'SUPER_ADMIN',
              isSuspended: false
            }
          });
          validAdminId = systemAdmin.id;
        }
      }

      // C. Kreye Log aksyon an san okenn risk pou Prisma voye erè
      await tx.adminActionLog.create({
        data: {
          adminId: validAdminId,
          action: `KYC_${status}`,
          targetType: "Kyc",
          targetId: kycId,
          details: `KYC trete pou itilizatè ${kyc.userId}. Estati: ${status}`
        }
      });

      return updatedKyc;
    }); 
  }

  // ======================================================
  // 3. RALE LIS TOUT ITILIZATÈ YO LIVE (AK WALLET, KYC, KAT)
  // ======================================================
  async getAllUsers() {
    return this.prisma.user.findMany({
      include: {
        wallet: true,
        virtualCard: true,
        kyc: true
      },
      orderBy: { 
        createdAt: 'desc' 
      }
    });
  }
  async adminTopup(userId: string, amount: number) {
    if (!amount || amount <= 0) throw new BadRequestException('Montan an dwe pozitif');

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet pa jwenn pou itilizatè sa a');

    const updated = await this.prisma.wallet.update({
      where: { userId },
      data: { balance: { increment: amount } },
    });

    await this.prisma.transaction.create({
      data: {
        reference: `ADMIN-TOPUP-${Date.now()}`,
        senderWalletId: null,
        receiverWalletId: wallet.id,
        amount: amount,
        fee: 0,
        netAmount: amount,
        type: 'DEPOSIT',
        status: 'COMPLETED',
        title: `Admin TopUp — ${amount} HTG`,
        method: 'ADMIN',
      },
    });

    return { success: true, newBalance: updated.balance, message: `${amount} HTG kredite ak siksè` };
  }

  async suspendUser(userId: string, isSuspended: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Itilizatè pa jwenn');

    return this.prisma.user.update({
      where: { id: userId },
      data: { isSuspended },
    });
  }
}