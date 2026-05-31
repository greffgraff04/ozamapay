import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

const MASTER_ID = process.env.OZAMAPAY_MASTER_ID as string;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async getDashboardStats() {
    const walletAggregates = await this.prisma.wallet.aggregate({ _sum: { balance: true } });
    const totalHTGInSystem = walletAggregates._sum.balance ? Number(walletAggregates._sum.balance) : 0;
    
    let totalUSDCardsBalance = 0;
    try {
      const cardAggregates = await this.prisma.virtualCard.aggregate({ _sum: { balance: true } });
      totalUSDCardsBalance = cardAggregates._sum.balance ? Number(cardAggregates._sum.balance) : 0;
    } catch (e) {}

    let totalFeesGenerated = 0;
    try {
      const transactionAggregates = await this.prisma.transaction.aggregate({ _sum: { fee: true } });
      totalFeesGenerated = transactionAggregates._sum.fee ? Number(transactionAggregates._sum.fee) : 0;
    } catch (e) {}

    const setJouPlisBone = new Date();
    setJouPlisBone.setDate(setJouPlisBone.getDate() - 7);

    let chartData: { name: string; amount: number }[] = [];
    try {
      const txs = await this.prisma.transaction.findMany({
        where: { createdAt: { gte: setJouPlisBone } },
        orderBy: { createdAt: 'asc' },
        take: 15
      });
      chartData = txs.map((t, idx) => ({
        name: t.createdAt ? new Date(t.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : `Tx-${idx}`,
        amount: Number(t.amount)
      }));
    } catch(e){}

    return {
      totalUsers: 0, 
      totalAgents: 0,
      chartData,
      treasury: {
        totalFeesGenerated,
        totalHTGInSystem,
        totalUSDCardsBalance
      }
    };
  }

  async getAllUsers() {
    return this.prisma.user.findMany({
      include: {
        wallet: true,
        kyc: true,
        agent: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getAllAgents() {
  return this.prisma.agent.findMany({
    include: {
      user: { 
        include: { 
          wallet: true, 
          kyc: true 
        } 
      },
      wallet: true,
      commissions: {
        orderBy: { createdAt: 'desc' },
        take: 5
      },
      kycs: {
        select: { id: true }
      },
      topups: {
        select: { id: true }
      },
      withdrawals: {
        select: { id: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
}

  async reviewKyc(kycId: string, status: 'APPROVED' | 'REJECTED', adminId: string) {
    // Capture kyc before transaction for email use after
    const kycBefore = await this.prisma.kyc.findUnique({ where: { id: kycId } });

    const updatedKyc = await this.prisma.$transaction(async (tx) => {
      // 1. Tcheke si KYC a egziste
      const kyc = await tx.kyc.findUnique({
        where: { id: kycId },
      });

      if (!kyc) {
        throw new NotFoundException('Dokiman KYC sa a pa egziste nan sistèm nan');
      }

      // 2. Mete estati KYC a ajou (APPROVED oswa REJECTED)
      const updated = await tx.kyc.update({
        where: { id: kycId },
        data: { status },
      });

      // 3. Si yo apwouve l, n ap debite frè KYC a epi aktive Ajan an
      if (status === 'APPROVED') {
        const rateEntry = await tx.rate.findUnique({ where: { key: 'USD_HTG' } });
        const currentRate = Number(rateEntry?.value || 140);
        const feeInHTG = 25 * currentRate;

        const userWallet = await tx.wallet.findUnique({ where: { userId: kyc.userId } });
        if (!userWallet) throw new NotFoundException('Wallet itilizatè a pa jwenn');

        if (Number(userWallet.balance) < feeInHTG) {
          throw new BadRequestException(
            `Itilizatè a pa gen ase fon pou frè KYC (${feeInHTG} HTG requis)`,
          );
        }

        const updatedUserWallet = await tx.wallet.update({
          where: { userId: kyc.userId },
          data: { balance: { decrement: feeInHTG } },
        });

        const kycTx = await tx.transaction.create({
          data: {
            reference: `KYC-${Date.now()}`,
            amount: feeInHTG,
            netAmount: feeInHTG,
            type: 'PAYMENT',
            status: 'COMPLETED',
            title: 'Frè KYC',
            description: 'Peman KYC $25 - Apwouve pa Admin',
            senderWalletId: userWallet.id,
          },
        });

        await tx.ledgerEntry.create({
          data: {
            walletId: userWallet.id,
            transactionId: kycTx.id,
            type: 'DEBIT',
            amount: feeInHTG,
            balanceBefore: userWallet.balance,
            balanceAfter: updatedUserWallet.balance,
          },
        });

        const agentExists = await tx.agent.findUnique({
          where: { userId: kyc.userId },
        });

        if (agentExists) {
          await tx.agent.update({
            where: { userId: kyc.userId },
            data: { status: 'ACTIVE' },
          });
        }

        await tx.user.update({
          where: { id: kyc.userId },
          data: { role: 'AGENT' },
        });
      }

      // 4. SEKITÈ SOU ADMIN_ID: Nou anpeche "ADMIN-SYS" bloke baz done a
      let validAdminId = adminId;

      if (!adminId || adminId === 'ADMIN-SYS') {
        const fallbackAdmin = await tx.user.findFirst({
          where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] } },
        });

        if (fallbackAdmin) {
          validAdminId = fallbackAdmin.id;
        } else {
          validAdminId = kyc.userId;
        }
      }

      // 5. Kreye Log aksyon admin lan san risk erè Foreign Key constraint
      await tx.adminActionLog.create({
        data: {
          adminId: validAdminId,
          action: `KYC_${status}`,
          targetType: 'Kyc',
          targetId: kycId,
          details: `Admin revize KYC pou itilizatè ${kyc.userId}. Rezilta: ${status} (Orijin: ${adminId})`,
        },
      });

      return updated;
    });

    // Send KYC email outside transaction so failure never rolls back the review
    if (kycBefore) {
      const kycUser = await this.prisma.user.findUnique({ where: { id: kycBefore.userId } });
      if (kycUser) {
        const name = `${kycBefore.firstName} ${kycBefore.lastName}`;
        if (status === 'APPROVED') {
          await this.mailService.sendKycApproved(kycUser.email, name);
        } else {
          await this.mailService.sendKycRejected(kycUser.email, name, '');
        }
      }
    }

    return updatedKyc;
  }


  async adminTopup(userId: string, amount: number) {
    if (amount <= 0) throw new BadRequestException('Kantite lajan an dwe pi gwo pase 0 HTG');
    
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) throw new NotFoundException('Itilizatè a pa gen yon bous (wallet) aktif');

      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: { balance: { increment: amount } },
      });

      // KORIJE: Jenerasyon yon referans inik pou tranzaksyon an
      const referenceGenerated = `ADM-TP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

      await tx.transaction.create({
        data: {
          reference: referenceGenerated, // <-- KORIJE: Nou ajoute jeden obligatwa sa a la a
          type: 'TOPUP',
          status: 'COMPLETED',
          amount,
          netAmount: amount,
          fee: 0,
          receiverWalletId: wallet.id,
          description: `Depo Administratè ki pwogrese pa Pipeline Santral`
        },
      });

      return updatedWallet;
    });
  }

  async adminTopupAgent(agentId: string, amount: number) {
    if (amount <= 0) throw new BadRequestException('Kantite lajan an dwe pi gwo pase 0 HTG');

    const agentWallet = await this.prisma.agentWallet.findUnique({ where: { agentId } });
    if (!agentWallet) throw new NotFoundException('Ajan sa a pa gen yon bous (agentWallet) aktif');

    return this.prisma.agentWallet.update({
      where: { agentId },
      data: { balance: { increment: amount } },
    });
  }

  async getLiquidityRequests() {
    return this.prisma.liquidityRequest.findMany({
      include: {
        agent: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            wallet: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveLiquidityRequest(id: string, adminNote?: string) {
    return this.prisma.$transaction(async (tx) => {
      const req = await tx.liquidityRequest.findUnique({ where: { id } });
      if (!req) throw new NotFoundException('Demand likidite a pa jwenn');
      if (req.status !== 'PENDING') throw new BadRequestException('Demand sa a trete deja');

      const agentWallet = await tx.agentWallet.findUnique({ where: { agentId: req.agentId } });
      if (!agentWallet) throw new NotFoundException('AgentWallet pa jwenn');

      if (Number(agentWallet.balance) < Number(req.amount)) {
        throw new BadRequestException('AgentWallet balance ensifizan pou apwouve demand sa a');
      }

      await tx.agentWallet.update({
        where: { agentId: req.agentId },
        data: { balance: { decrement: req.amount } },
      });

      return tx.liquidityRequest.update({
        where: { id },
        data: { status: 'APPROVED', adminNote: adminNote ?? null },
      });
    });
  }

  async rejectLiquidityRequest(id: string, adminNote?: string) {
    const req = await this.prisma.liquidityRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Demand likidite a pa jwenn');
    if (req.status !== 'PENDING') throw new BadRequestException('Demand sa a trete deja');

    return this.prisma.liquidityRequest.update({
      where: { id },
      data: { status: 'REJECTED', adminNote: adminNote ?? null },
    });
  }

  async suspendUser(userId: string, isSuspended: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Kliyan sa a pa jwenn nan sistèm nan');

    return this.prisma.user.update({
      where: { id: userId },
      data: { isSuspended },
    });
  }

  async getPendingRequests() {
    return this.prisma.transaction.findMany({
      where: { status: 'PENDING', type: { in: ['TOPUP', 'WITHDRAWAL'] } },
      include: {
        receiverWallet: { include: { user: true } },
        senderWallet: { include: { user: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFinanceRequests() {
    return this.prisma.serviceRequest.findMany({
      include: { user: { include: { wallet: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async processFinanceRequest(id: string, status: 'COMPLETED' | 'REJECTED', adminNote?: string) {
    const req = await this.prisma.serviceRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Demann finans sa a pa jwenn');
    if (req.status !== 'PENDING') throw new BadRequestException('Demann sa a trete deja');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.serviceRequest.update({
        where: { id },
        data: { status, adminNote: adminNote ?? null },
      });

      let parsed: { mode?: string } = {};
      try { parsed = JSON.parse(req.details || '{}'); } catch {}
      const mode = parsed.mode; // 'BUY' or 'SELL'

      const wallet = await tx.wallet.findUnique({ where: { userId: req.userId } });

      if (status === 'COMPLETED') {
        if (mode === 'BUY' && wallet) {
          // User paid USD externally → credit equivalent HTG minus fee
          const rateEntry = await tx.rate.findUnique({ where: { key: 'USD_HTG' } });
          const rate = Number(rateEntry?.value || 140);
          const amount = Number(req.amount);
          const fee = Number(req.fee);
          const creditHTG = (amount - fee) * rate;

          await tx.wallet.update({
            where: { userId: req.userId },
            data: { balance: { increment: creditHTG } },
          });

          await tx.transaction.create({
            data: {
              reference: `FIN-BUY-${Date.now()}`,
              amount: creditHTG,
              netAmount: creditHTG,
              fee,
              type: 'TOPUP',
              status: 'COMPLETED',
              title: `Finance ${req.serviceType} - BUY`,
              description: `Kredi HTG apre apwobasyon demann ${req.serviceType}`,
              receiverWalletId: wallet.id,
            },
          });
        } else if (mode === 'SELL' && wallet) {
          // User wants to receive USD → debit the HTG amount from their wallet
          const amount = Number(req.amount);
          const fee = Number(req.fee);

          await tx.wallet.update({
            where: { userId: req.userId },
            data: { balance: { decrement: amount } },
          });

          await tx.transaction.create({
            data: {
              reference: `FIN-SELL-${Date.now()}`,
              amount,
              netAmount: amount - fee,
              fee,
              type: 'WITHDRAWAL',
              status: 'COMPLETED',
              title: `Finance ${req.serviceType} - SELL`,
              description: `Debi HTG apre apwobasyon demann ${req.serviceType}`,
              senderWalletId: wallet.id,
            },
          });
        }

        await tx.notification.create({
          data: {
            userId: req.userId,
            title: 'Finance Request Konfime',
            message: `Demann ${req.serviceType} ou an apwouve pa admin`,
            type: 'SUCCESS',
          },
        });
      } else {
        // REJECTED — nothing was debited on submission, so no refund needed
        await tx.notification.create({
          data: {
            userId: req.userId,
            title: 'Finance Request Rejte',
            message: `Demann ${req.serviceType} ou an rejte pa admin`,
            type: 'ERROR',
          },
        });
      }

      return updated;
    });
  }

  async processManualTransaction(txId: string, status: 'COMPLETED' | 'REJECTED', adminId: string) {
    // Capture transaction info before DB changes for email use after
    const txBefore = await this.prisma.transaction.findUnique({
      where: { id: txId },
      include: { receiverWallet: true, senderWallet: true },
    });

    const updatedTx = await this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id: txId },
        include: { receiverWallet: true, senderWallet: true },
      });
      if (!transaction) throw new NotFoundException('Tranzaksyon sa a pa egziste');
      if (transaction.status !== 'PENDING') throw new BadRequestException('Tranzaksyon sa a trete deja');

      const userId = transaction.type === 'TOPUP'
        ? transaction.receiverWallet?.userId
        : transaction.senderWallet?.userId;

      if (status === 'REJECTED') {
        const rejectedTx = await tx.transaction.update({
          where: { id: txId },
          data: { status: 'REJECTED' },
        });

        if (userId) {
          await tx.notification.create({
            data: {
              userId,
              title: 'Demann Rejte ❌',
              message: `Demann ${transaction.amount} HTG rejte pa admin`,
              type: 'ERROR',
            },
          });
        }

        return rejectedTx;
      }

      if (transaction.type === 'TOPUP' && transaction.receiverWalletId) {
        // Credit full amount — topup fee is on top, not deducted from user
        await tx.wallet.update({
          where: { id: transaction.receiverWalletId },
          data: { balance: { increment: transaction.netAmount } },
        });

        if (Number(transaction.fee) > 0) {
          const txUserId = transaction.receiverWallet?.userId;
          const txUser = txUserId ? await tx.user.findUnique({ where: { id: txUserId } }) : null;
          const refAgentId = txUser?.referredByAgentId ?? null;
          const masterWallet = await tx.wallet.findFirst({ where: { userId: MASTER_ID } });

          if (refAgentId) {
            const agent = await tx.agent.findUnique({ where: { id: refAgentId }, include: { wallet: true } });
            if (agent?.wallet) {
              const agentFee = Math.round(Number(transaction.amount) * 0.02 * 100) / 100;
              const ozamaFee = Math.round((Number(transaction.fee) - agentFee) * 100) / 100;
              await tx.agentWallet.update({ where: { agentId: agent.id }, data: { balance: { increment: agentFee } } });
              await tx.agent.update({ where: { id: agent.id }, data: { totalCommission: { increment: agentFee } } });
              await tx.commission.create({ data: { agentId: agent.id, amount: agentFee, type: 'TOPUP', transactionId: txId } });
              if (masterWallet) await tx.wallet.update({ where: { id: masterWallet.id }, data: { balance: { increment: ozamaFee } } });
            } else if (masterWallet) {
              await tx.wallet.update({ where: { id: masterWallet.id }, data: { balance: { increment: transaction.fee } } });
            }
          } else if (masterWallet) {
            await tx.wallet.update({ where: { id: masterWallet.id }, data: { balance: { increment: transaction.fee } } });
          }
        }
      } else if (transaction.type === 'WITHDRAWAL' && transaction.senderWalletId) {
        if (Number(transaction.fee) > 0) {
          const txUserId = transaction.senderWallet?.userId;
          const txUser = txUserId ? await tx.user.findUnique({ where: { id: txUserId } }) : null;
          const refAgentId = txUser?.referredByAgentId ?? null;
          const masterWallet = await tx.wallet.findFirst({ where: { userId: MASTER_ID } });

          if (refAgentId) {
            const agent = await tx.agent.findUnique({ where: { id: refAgentId }, include: { wallet: true } });
            if (agent?.wallet) {
              const agentFee = Math.round(Number(transaction.amount) * 0.0075 * 100) / 100;
              const ozamaFee = Math.round((Number(transaction.fee) - agentFee) * 100) / 100;
              await tx.agentWallet.update({ where: { agentId: agent.id }, data: { balance: { increment: agentFee } } });
              await tx.agent.update({ where: { id: agent.id }, data: { totalCommission: { increment: agentFee } } });
              await tx.commission.create({ data: { agentId: agent.id, amount: agentFee, type: 'WITHDRAWAL', transactionId: txId } });
              if (masterWallet) await tx.wallet.update({ where: { id: masterWallet.id }, data: { balance: { increment: ozamaFee } } });
            } else if (masterWallet) {
              await tx.wallet.update({ where: { id: masterWallet.id }, data: { balance: { increment: transaction.fee } } });
            }
          } else if (masterWallet) {
            await tx.wallet.update({ where: { id: masterWallet.id }, data: { balance: { increment: transaction.fee } } });
          }
        }
      }

      const result = await tx.transaction.update({
        where: { id: txId },
        data: { status: 'COMPLETED' },
      });

      if (userId) {
        const notifTitle = transaction.type === 'TOPUP' ? 'Depot Konfime ✅' : 'Retrè Konfime ✅';
        const notifMsg = transaction.type === 'TOPUP'
          ? `Depot ${transaction.amount} HTG via ${transaction.method} konfime pa admin`
          : `Retrè ${transaction.amount} HTG via ${transaction.method} konfime pa admin`;
        await tx.notification.create({
          data: { userId, title: notifTitle, message: notifMsg, type: 'SUCCESS' },
        });
      }

      const validAdmin = await tx.user.findFirst({
        where: { id: adminId, role: { in: ['SUPER_ADMIN', 'ADMIN'] } },
      });

      if (validAdmin) {
        await tx.adminActionLog.create({
          data: {
            adminId: validAdmin.id,
            action: `MANUAL_TX_${status}`,
            targetType: 'Transaction',
            targetId: txId,
            details: `Admin ${status} tranzaksyon ${transaction.type} ki vize ${transaction.amount} HTG`,
          },
        });
      }

      return result;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    // Send confirmation email outside transaction so failure never rolls back DB changes
    if (status === 'COMPLETED' && txBefore) {
      const userId = txBefore.type === 'TOPUP'
        ? txBefore.receiverWallet?.userId
        : txBefore.senderWallet?.userId;
      if (userId) {
        const txUser = await this.prisma.user.findUnique({ where: { id: userId } });
        if (txUser) {
          const name = txUser.name || 'Kliyan';
          const amount = Number(txBefore.amount);
          const method = (txBefore as any).method || 'N/A';
          if (txBefore.type === 'TOPUP') {
            await this.mailService.sendTopupConfirmed(txUser.email, name, amount, method);
          } else if (txBefore.type === 'WITHDRAWAL') {
            await this.mailService.sendWithdrawalConfirmed(txUser.email, name, amount, method);
          }
        }
      }
    }

    return updatedTx;
  }
}