import { Injectable, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Cron } from '@nestjs/schedule';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { COMMISSION_AGENT_KYC } from '../common/constants';

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
      // 1. Tcheke si KYC a egziste epi toujou PENDING
      const kyc = await tx.kyc.findUnique({
        where: { id: kycId },
      });

      if (!kyc) {
        throw new NotFoundException('Dokiman KYC sa a pa egziste nan sistèm nan');
      }

      if (kyc.status !== 'PENDING') {
        throw new BadRequestException('KYC sa a deja trete');
      }

      // 2. Mete estati KYC a ajou (APPROVED oswa REJECTED)
      const updated = await tx.kyc.update({
        where: { id: kycId },
        data: {
          status,
          ...(status === 'APPROVED' && { reviewedAt: new Date() }),
        },
      });

      // 3. Si yo apwouve l, n ap debite frè KYC a epi aktive Ajan an
      if (status === 'APPROVED') {
        const rateEntry = await tx.rate.findUnique({ where: { key: 'USD_HTG' } });
        const currentRate = Number(rateEntry?.value || 135);
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

        // Distribute KYC fee: 405 HTG to referring agent, rest to master
        const masterWallet = await tx.wallet.findFirst({ where: { userId: MASTER_ID } });

        if (kyc.agentId) {
          const agentCommission = COMMISSION_AGENT_KYC;
          const masterAmount = Math.round((feeInHTG - agentCommission) * 100) / 100;

          const agentRecord = await tx.agent.findUnique({
            where: { id: kyc.agentId },
            include: { wallet: true },
          });

          if (agentRecord?.wallet) {
            await tx.agentWallet.update({
              where: { agentId: kyc.agentId },
              data: { balance: { increment: agentCommission } },
            });
            await tx.agent.update({
              where: { id: kyc.agentId },
              data: {
                totalCommission: { increment: agentCommission },
                totalKyc: { increment: 1 },
              },
            });
            await tx.commission.create({
              data: { agentId: kyc.agentId, amount: agentCommission, type: 'KYC', transactionId: kycTx.id },
            });
            if (masterWallet) {
              await tx.wallet.update({
                where: { id: masterWallet.id },
                data: { balance: { increment: masterAmount } },
              });
            }
          } else {
            // Agent record missing wallet — credit full fee to master
            if (masterWallet) {
              await tx.wallet.update({
                where: { id: masterWallet.id },
                data: { balance: { increment: feeInHTG } },
              });
            }
          }
        } else {
          if (masterWallet) {
            await tx.wallet.update({
              where: { id: masterWallet.id },
              data: { balance: { increment: feeInHTG } },
            });
          }
        }

        const agentExists = await tx.agent.findUnique({
          where: { userId: kyc.userId },
        });

        if (agentExists) {
          await tx.agent.update({
            where: { userId: kyc.userId },
            data: { status: 'ACTIVE' },
          });
          await tx.user.update({
            where: { id: kyc.userId },
            data: { role: 'AGENT' },
          });
        }
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

  async activateAgent(agentId: string) {
    const agent = await this.prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) throw new NotFoundException('Ajan sa a pa egziste');

    return this.prisma.$transaction(async (tx) => {
      await tx.agent.update({ where: { id: agentId }, data: { status: 'ACTIVE' } });
      await tx.user.update({ where: { id: agent.userId }, data: { role: 'AGENT' } });
      return { message: 'Ajan aktive avèk siksè' };
    });
  }

  async updateAgentPackage(agentId: string, body: { packageType?: string; customCommission?: number; maxLimit?: number }) {
    const agent = await this.prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) throw new NotFoundException('Ajan sa a pa egziste');

    const levelMap: Record<string, 'BRONZE' | 'SILVER' | 'GOLD'> = {
      STANDARD_AGENT: 'BRONZE',
      VIP_AGENCE: 'SILVER',
      MASTER_NODE: 'GOLD',
    };

    return this.prisma.agent.update({
      where: { id: agentId },
      data: {
        ...(body.packageType && levelMap[body.packageType] && { level: levelMap[body.packageType] }),
        ...(body.customCommission !== undefined && { commissionRate: body.customCommission }),
        ...(body.maxLimit !== undefined && { dailyLimit: body.maxLimit }),
      },
    });
  }

  async adminTopupAgent(agentId: string, amount: number) {
    if (amount <= 0) throw new BadRequestException('Kantite lajan an dwe pi gwo pase 0 HTG');

    return this.prisma.$transaction(async (tx) => {
      const agentWallet = await tx.agentWallet.findUnique({ where: { agentId } });
      if (!agentWallet) throw new NotFoundException('Ajan sa a pa gen yon bous (agentWallet) aktif');

      const updated = await tx.agentWallet.update({
        where: { agentId },
        data: { balance: { increment: amount } },
      });

      // Audit trail for admin agent credits
      await tx.commission.create({
        data: {
          agentId,
          type: 'TOPUP',
          amount,
        },
      });

      return updated;
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
    const INTERNATIONAL_METHODS = ['ZELLE', 'CASHAPP', 'WISE', 'MERU', 'USDT', 'BANK'];

    // Fetch before the transaction so user data is available for email after commit
    const reqBefore = await this.prisma.serviceRequest.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!reqBefore) throw new NotFoundException('Demann finans sa a pa jwenn');

    let parsed: { mode?: string } = {};
    try { parsed = JSON.parse(reqBefore.details || '{}'); } catch {}
    const mode = parsed.mode; // 'BUY' or 'SELL'
    const serviceType = String(reqBefore.serviceType);
    const isIntl = INTERNATIONAL_METHODS.includes(serviceType.toUpperCase());

    const { updatedReq, emailNetAmount } = await this.prisma.$transaction(async (tx) => {
      // Re-read inside tx so the status check is race-safe under Serializable isolation
      const req = await tx.serviceRequest.findUnique({ where: { id } });
      if (!req) throw new NotFoundException('Demann finans sa a pa jwenn');
      if (req.status !== 'PENDING') throw new BadRequestException('Demann sa a trete deja');

      const updated = await tx.serviceRequest.update({
        where: { id },
        data: { status, adminNote: adminNote ?? null },
      });

      const wallet = await tx.wallet.findUnique({ where: { userId: req.userId } });
      if (!wallet) throw new NotFoundException('Wallet itilizatè a pa jwenn');

      let emailNetAmount = 0;

      if (status === 'COMPLETED') {
        if (mode === 'BUY') {
          const rateEntry = await tx.rate.findUnique({ where: { key: 'USD_HTG' } });
          const usdHtgRate = Number(rateEntry?.value || 140);
          const amountHTG = isIntl
            ? Math.round(Number(req.amount) * usdHtgRate * 100) / 100
            : Number(req.amount);
          const fee = Math.round(amountHTG * 0.06 * 100) / 100;
          const netAmount = Math.round((amountHTG - fee) * 100) / 100;
          emailNetAmount = netAmount;

          await tx.wallet.update({
            where: { userId: req.userId },
            data: { balance: { increment: netAmount } },
          });

          await tx.wallet.update({
            where: { userId: MASTER_ID },
            data: { balance: { increment: fee } },
          });

          await tx.transaction.create({
            data: {
              reference: `FIN-BUY-${Date.now()}`,
              amount: amountHTG,
              netAmount,
              fee,
              type: 'TOPUP',
              status: 'COMPLETED',
              title: `Finance ${serviceType} - BUY`,
              description: `Kredi HTG apre apwobasyon demann ${serviceType}`,
              receiverWalletId: wallet.id,
            },
          });

          await tx.notification.create({
            data: {
              userId: req.userId,
              title: 'Finance Konfime ✅',
              message: `Depot ${serviceType} ou konfime — ${netAmount} HTG ajoute nan kont ou`,
              type: 'SUCCESS',
            },
          });
        } else if (mode === 'SELL') {
          const amountHTG = Number(req.amount);
          const sellFee = Math.round(Number(req.fee) * 100) / 100;
          const netSell = Math.round((amountHTG - sellFee) * 100) / 100;
          emailNetAmount = netSell;

          // D1: balance check before decrement inside Serializable tx
          if (Number(wallet.balance) < amountHTG) {
            throw new BadRequestException('Balans ensifizan pou demann SELL sa a');
          }

          await tx.wallet.update({
            where: { userId: req.userId },
            data: { balance: { decrement: amountHTG } },
          });

          // C1: credit master with the platform fee
          await tx.wallet.update({
            where: { userId: MASTER_ID },
            data: { balance: { increment: sellFee } },
          });

          await tx.transaction.create({
            data: {
              reference: `FIN-SELL-${Date.now()}`,
              amount: amountHTG,
              netAmount: netSell,
              fee: sellFee,
              type: 'WITHDRAWAL',
              status: 'COMPLETED',
              title: `Finance ${serviceType} - SELL`,
              description: `Debi HTG apre apwobasyon demann ${serviceType}`,
              senderWalletId: wallet.id,
            },
          });

          await tx.notification.create({
            data: {
              userId: req.userId,
              title: 'Finance Konfime ✅',
              message: `Retrè ${serviceType} ou konfime`,
              type: 'SUCCESS',
            },
          });
        }
      } else {
        await tx.notification.create({
          data: {
            userId: req.userId,
            title: 'Finance Rejte ❌',
            message: `Demann ${serviceType} ou an rejte pa admin`,
            type: 'ERROR',
          },
        });
      }

      return { updatedReq: updated, emailNetAmount };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    // Send email outside transaction so a send failure never rolls back DB changes
    if (reqBefore.user) {
      const { email, name } = reqBefore.user;
      const displayName = name || 'Kliyan';
      try {
        if (status === 'COMPLETED') {
          await this.mailService.sendFinanceConfirmed(email, displayName, serviceType, emailNetAmount, mode ?? '');
        } else if (status === 'REJECTED') {
          await this.mailService.sendKycRejected(email, displayName, adminNote ?? `Demann ${serviceType} ou rejte pa admin.`);
        }
      } catch {}
    }

    return updatedReq;
  }

  // ── INVITATION SYSTEM ─────────────────────────────────────────────────────

  private generate6CharCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async inviteEmployee(email: string, role: string, invitedByUserId: string) {
    const VALID_ROLES = ['SUPER_ADMIN', 'AGENT', 'SUPPORT', 'ADMIN'];
    if (!VALID_ROLES.includes(role)) {
      throw new BadRequestException(`Rôle invalide. Valeurs acceptées: ${VALID_ROLES.join(', ')}`);
    }

    const existing = await this.prisma.adminInvitation.findUnique({ where: { email } });
    if (existing && !existing.accepted) {
      throw new BadRequestException('Une invitation est déjà en cours pour cet email');
    }
    if (existing) {
      await this.prisma.adminInvitation.delete({ where: { email } });
    }

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await this.prisma.adminInvitation.create({
      data: { email, role: role as any, token, expiresAt, invitedBy: invitedByUserId },
    });

    const link = `${process.env.FRONTEND_URL || 'https://ozamapay.com'}/admin/setup?token=${token}`;
    await this.mailService.sendAdminInvitation(email, role, link);

    return invitation;
  }

  async getInvitations() {
    return this.prisma.adminInvitation.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async validateSetupToken(token: string) {
    const inv = await this.prisma.adminInvitation.findUnique({ where: { token } });
    if (!inv) throw new NotFoundException('Token d\'invitation invalide');
    if (inv.accepted) throw new BadRequestException('Cette invitation a déjà été utilisée');
    if (inv.expiresAt < new Date()) throw new BadRequestException('L\'invitation a expiré. Demandez une nouvelle invitation.');
    return { email: inv.email, role: inv.role, expiresAt: inv.expiresAt };
  }

  async acceptInvitation(token: string, personalInfo: {
    firstName: string;
    lastName: string;
    phone: string;
    password: string;
  }, dailyCode: string) {
    const inv = await this.prisma.adminInvitation.findUnique({ where: { token } });
    if (!inv) throw new UnauthorizedException('Token d\'invitation invalide');
    if (inv.accepted) throw new BadRequestException('Cette invitation a déjà été utilisée');
    if (inv.expiresAt < new Date()) throw new BadRequestException('L\'invitation a expiré');

    const activeCode = await this.prisma.dailyAccessCode.findFirst({
      where: { isActive: true, expiresAt: { gt: new Date() } },
    });
    if (!activeCode || activeCode.code !== dailyCode.toUpperCase()) {
      throw new UnauthorizedException('Code journalier invalide');
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email: inv.email } });
    if (existingUser) throw new BadRequestException('Un compte existe déjà avec cet email');

    const hashedPassword = await bcrypt.hash(personalInfo.password, 10);
    const name = `${personalInfo.firstName} ${personalInfo.lastName}`;

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: inv.email,
          password: hashedPassword,
          name,
          phone: personalInfo.phone,
          role: inv.role,
          adminSetupComplete: true,
          adminInvitationToken: token,
        },
      });
      await tx.wallet.create({ data: { userId: newUser.id, balance: 0 } });
      await tx.adminInvitation.update({ where: { token }, data: { accepted: true } });
      return newUser;
    });

    await this.mailService.sendWelcome(user.email, user.name || 'Employé');
    return { message: 'Compte créé avec succès', email: user.email };
  }

  // ── DAILY ACCESS CODE ──────────────────────────────────────────────────────

  async generateDailyCode(): Promise<{ code: string; expiresAt: Date }> {
    await this.prisma.dailyAccessCode.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    const code = this.generate6CharCode();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.dailyAccessCode.create({ data: { code, expiresAt, isActive: true } });
    return { code, expiresAt };
  }

  async getCurrentDailyCode() {
    return this.prisma.dailyAccessCode.findFirst({
      where: { isActive: true },
      orderBy: { generatedAt: 'desc' },
    });
  }

  @Cron('0 4 * * *', { timeZone: 'America/Port-au-Prince' }) // 00:00 Haiti time (AST UTC-4 = 04:00 UTC)
  async autoGenerateDailyCode(): Promise<void> {
    const { code, expiresAt } = await this.generateDailyCode();

    const today = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
      timeZone: 'America/Port-au-Prince',
    });

    const masterUser = await this.prisma.user.findUnique({
      where: { id: MASTER_ID },
      select: { email: true },
    });

    if (masterUser && masterUser.email !== 'contact@ozamapay.com') {
      await this.mailService.sendDailyCode(masterUser.email, code, today, expiresAt);
    }

    // Always send to team contact address
    await this.mailService.sendDailyCode('contact@ozamapay.com', code, today, expiresAt);

    await this.prisma.adminActionLog.create({
      data: {
        adminId: MASTER_ID,
        action: 'DAILY_CODE_AUTO_GENERATED',
        targetType: 'DailyAccessCode',
        details: 'Code journalier 6 caract. généré automatiquement à minuit heure Haïti',
      },
    });
  }

  // ── SESSION & ACTIVITY TRACKING ───────────────────────────────────────────

  async getSessions() {
    return this.prisma.adminSession.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { loginAt: 'desc' },
      take: 200,
    });
  }

  async getActivityLogs() {
    return this.prisma.adminActionLog.findMany({
      include: {
        admin: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async logActivity(adminId: string, action: string, details: string, ip?: string) {
    try {
      const validAdmin = await this.prisma.user.findFirst({
        where: { id: adminId, role: { in: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'] } },
      });
      if (validAdmin) {
        await this.prisma.adminActionLog.create({
          data: { adminId, action, details, ipAddress: ip ?? null },
        });
      }
    } catch {}
  }

  // ── KYC REMINDER ──────────────────────────────────────────────────────────

  async sendPromoEmail(): Promise<{ sent: number }> {
    const users = await this.prisma.user.findMany({
      where: { isSuspended: false },
      select: { email: true, name: true },
    });

    let sent = 0;
    for (const user of users) {
      await this.mailService.sendPromoMondialeEmail(user.email, user.name || 'Kliyan');
      sent++;
    }
    return { sent };
  }

  async sendKycReminder(): Promise<{ sent: number }> {
    const [totalCount, verifiedCount, users] = await Promise.all([
      this.prisma.user.count({ where: { isSuspended: false } }),
      this.prisma.kyc.count({ where: { status: 'APPROVED' } }),
      this.prisma.user.findMany({
        where: {
          isSuspended: false,
          OR: [
            { kyc: null },
            { kyc: { status: { not: 'APPROVED' } } },
          ],
        },
        select: { email: true, name: true },
      }),
    ]);

    let sent = 0;
    for (const user of users) {
      await this.mailService.sendKycReminder(user.email, user.name || 'Kliyan', verifiedCount, totalCount);
      sent++;
    }
    return { sent };
  }

  async getCooStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalUsers, kycPending, totalTransactionsToday, revenueAgg, pendingTopups, pendingWithdrawals] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.kyc.count({ where: { status: 'PENDING' } }),
      this.prisma.transaction.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.transaction.aggregate({
        _sum: { fee: true },
        where: { status: 'COMPLETED', createdAt: { gte: todayStart } },
      }),
      this.prisma.transaction.count({ where: { type: 'TOPUP', status: 'PENDING' } }),
      this.prisma.transaction.count({ where: { type: 'WITHDRAWAL', status: 'PENDING' } }),
    ]);

    return {
      totalUsers,
      kycPending,
      totalTransactionsToday,
      revenueToday: Number(revenueAgg._sum.fee || 0),
      pendingTopups,
      pendingWithdrawals,
    };
  }

  async getAgentStats() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [totalAgents, activeAgents, commissionsAgg, pendingLiquidityRequests] = await Promise.all([
      this.prisma.agent.count(),
      this.prisma.agent.count({
        where: { commissions: { some: { createdAt: { gte: sevenDaysAgo } } } },
      }),
      this.prisma.commission.aggregate({ _sum: { amount: true } }),
      this.prisma.liquidityRequest.count({ where: { status: 'PENDING' } }),
    ]);

    return {
      totalAgents,
      activeAgents,
      totalCommissions: Number(commissionsAgg._sum.amount || 0),
      pendingLiquidityRequests,
    };
  }

  async getSupportStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalUsers, newUsersToday, suspendedUsers, usersWithoutKyc] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.user.count({ where: { isSuspended: true } }),
      this.prisma.user.count({
        where: {
          OR: [
            { kyc: { is: null } },
            { kyc: { status: { not: 'APPROVED' } } },
          ],
        },
      }),
    ]);

    return { totalUsers, newUsersToday, suspendedUsers, usersWithoutKyc };
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
        // Refund pre-debited funds for WITHDRAWAL (amount + fee were taken at request time)
        if (transaction.type === 'WITHDRAWAL' && transaction.senderWallet?.userId) {
          const refundAmount = Math.round((Number(transaction.amount) + Number(transaction.fee)) * 100) / 100;
          await tx.wallet.update({
            where: { userId: transaction.senderWallet.userId },
            data: { balance: { increment: refundAmount } },
          });
          await tx.transaction.create({
            data: {
              reference: `REFUND-${txId.slice(-8).toUpperCase()}`,
              receiverWalletId: transaction.senderWalletId!,
              amount: refundAmount,
              fee: 0,
              netAmount: refundAmount,
              type: 'TOPUP',
              status: 'COMPLETED',
              method: 'REFUND',
              title: 'Rembourseman Retrè Rejte',
              description: `Retrè ${transaction.amount} HTG rejte — ${refundAmount} HTG retounen`,
            },
          });
        }

        const rejectedTx = await tx.transaction.update({
          where: { id: txId },
          data: { status: 'REJECTED' },
        });

        if (userId) {
          await tx.notification.create({
            data: {
              userId,
              title: 'Demann Rejte ❌',
              message: `Demann retrè ${transaction.amount} HTG rejte pa admin — balans ou retounen`,
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

  // ── BUSINESS ADMIN ────────────────────────────────────────────────────────

  async getBusinessApplications(status?: string) {
    return this.prisma.business.findMany({
      where: status ? { status: status as any } : {},
      include: {
        owner: { select: { id: true, name: true, email: true } },
        wallet: { select: { balance: true } },
        members: { select: { id: true } },
        application: { select: { tier: true, phone: true, address: true, adminNote: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveBusinessApplication(businessId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      include: { owner: true },
    });
    if (!business) throw new NotFoundException('Biznis pa jwenn');
    if (business.status !== 'PENDING') throw new BadRequestException('Biznis sa a deja trete');

    await this.prisma.$transaction([
      this.prisma.business.update({ where: { id: businessId }, data: { status: 'APPROVED' } }),
      this.prisma.merchantApplication.update({
        where: { id: business.applicationId },
        data: { status: 'APPROVED' },
      }),
    ]);

    try {
      await this.mailService.sendBusinessApproved(
        business.owner.email,
        business.owner.name || business.owner.email,
        business.businessName,
      );
    } catch {}

    return { success: true };
  }

  async rejectBusinessApplication(businessId: string, reason?: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      include: { owner: true },
    });
    if (!business) throw new NotFoundException('Biznis pa jwenn');
    if (business.status !== 'PENDING') throw new BadRequestException('Biznis sa a deja trete');

    await this.prisma.$transaction([
      this.prisma.business.update({ where: { id: businessId }, data: { status: 'REJECTED' } }),
      this.prisma.merchantApplication.update({
        where: { id: business.applicationId },
        data: { status: 'REJECTED', adminNote: reason ?? null },
      }),
    ]);

    try {
      await this.mailService.sendBusinessRejected(
        business.owner.email,
        business.owner.name || business.owner.email,
        business.businessName,
        reason,
      );
    } catch {}

    return { success: true };
  }

  async getAllBusinesses() {
    return this.prisma.business.findMany({
      include: {
        owner: { select: { id: true, name: true, email: true } },
        wallet: { select: { balance: true } },
        members: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateBusinessTier(businessId: string, tier: string) {
    if (!['STARTER', 'PRO', 'ENTERPRISE'].includes(tier)) {
      throw new BadRequestException('Tyè envalid — STARTER, PRO, oswa ENTERPRISE sèlman');
    }

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      include: { owner: true },
    });
    if (!business) throw new NotFoundException('Biznis pa jwenn');

    const previousTier = business.tier;
    await this.prisma.business.update({
      where: { id: businessId },
      data: { tier: tier as any },
    });

    if (previousTier !== tier) {
      try {
        await this.mailService.sendBusinessTierChanged(
          business.owner.email,
          business.owner.name || business.owner.email,
          business.businessName,
          previousTier,
          tier,
        );
      } catch {}
    }

    return { success: true, previousTier, tier };
  }

  // ── BUSINESS WITHDRAWALS (MONCASH/BANK — manual admin processing) ─────────
  // PERSONAL_WALLET withdrawals settle instantly and are never PENDING, so
  // any WITHDRAWAL row still PENDING here is by definition a MonCash/Bank
  // request awaiting manual payout.

  private withdrawalMethod(description: string | null): string {
    return description?.includes('MONCASH') ? 'MONCASH' : 'BANK';
  }

  async getPendingBusinessWithdrawals() {
    const rows = await this.prisma.businessTransaction.findMany({
      where: { type: 'WITHDRAWAL', status: 'PENDING' },
      include: {
        businessWallet: {
          include: { business: { include: { owner: { select: { id: true, name: true, email: true } } } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return rows.map((tx) => ({
      id: tx.id,
      businessName: tx.businessWallet.business.businessName,
      amount: tx.amount,
      fee: tx.fee,
      netAmount: tx.netAmount,
      method: this.withdrawalMethod(tx.description),
      description: tx.description,
      submittedAt: tx.createdAt,
      owner: tx.businessWallet.business.owner,
    }));
  }

  async approveBusinessWithdrawal(txId: string) {
    const tx = await this.prisma.businessTransaction.findUnique({
      where: { id: txId },
      include: {
        businessWallet: {
          include: { business: { include: { owner: true } } },
        },
      },
    });
    if (!tx) throw new NotFoundException('Tranzaksyon retrè pa jwenn');
    if (tx.type !== 'WITHDRAWAL' || tx.status !== 'PENDING') {
      throw new BadRequestException('Tranzaksyon sa a deja trete');
    }

    const fee = Number(tx.fee);
    await this.prisma.$transaction(async (p) => {
      await p.businessTransaction.update({ where: { id: txId }, data: { status: 'COMPLETED' } });
      if (fee > 0) {
        await p.wallet.update({ where: { userId: MASTER_ID }, data: { balance: { increment: fee } } });
      }
    });

    const owner = tx.businessWallet.business.owner;
    const method = this.withdrawalMethod(tx.description);
    try {
      await this.mailService.sendBusinessWithdrawalApproved(
        owner.email,
        owner.name || owner.email,
        tx.businessWallet.business.businessName,
        Number(tx.netAmount),
        method,
      );
    } catch {}

    return { success: true };
  }

  async rejectBusinessWithdrawal(txId: string, reason?: string) {
    const tx = await this.prisma.businessTransaction.findUnique({
      where: { id: txId },
      include: {
        businessWallet: {
          include: { business: { include: { owner: true } } },
        },
      },
    });
    if (!tx) throw new NotFoundException('Tranzaksyon retrè pa jwenn');
    if (tx.type !== 'WITHDRAWAL' || tx.status !== 'PENDING') {
      throw new BadRequestException('Tranzaksyon sa a deja trete');
    }

    const amount = Number(tx.amount);
    await this.prisma.$transaction(async (p) => {
      await p.businessTransaction.update({ where: { id: txId }, data: { status: 'FAILED' } });
      await p.businessWallet.update({
        where: { id: tx.businessWalletId },
        data: { balance: { increment: amount } },
      });
    });

    const owner = tx.businessWallet.business.owner;
    try {
      await this.mailService.sendBusinessWithdrawalRejected(
        owner.email,
        owner.name || owner.email,
        tx.businessWallet.business.businessName,
        amount,
        reason,
      );
    } catch {}

    return { success: true };
  }
}