import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma, BusinessMemberRole, BusinessApplicationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { v4 as uuidv4 } from 'uuid';

// ── Named constant — easy to tune ──────────────────────────────────────────
const BUSINESS_WITHDRAW_FEE = 0.015; // 1.5%

// ── DTOs ────────────────────────────────────────────────────────────────────

export class ApplyBusinessDto {
  businessName: string;
  category: string;
  tier: 'STARTER' | 'PRO' | 'ENTERPRISE';
  phone: string;
  address: string;
}

export class WithdrawDto {
  amount: number;
  destination: 'PERSONAL_WALLET' | 'MONCASH' | 'BANK';
  accountInfo?: string;
}

export class InviteMemberDto {
  email: string;
  role: 'ACCOUNTANT' | 'CASHIER';
}

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class BusinessService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  private round(n: number) {
    return Math.round(n * 100) / 100;
  }

  private async checkKyc(userId: string): Promise<void> {
    const kyc = await this.prisma.kyc.findUnique({ where: { userId } });
    if (!kyc || kyc.status !== 'APPROVED') {
      throw new ForbiddenException(
        'Ou dwe gen KYC apwouve anvan ou ka aplike pou Business',
      );
    }
  }

  // Returns the BusinessMember row for the user in the given business.
  // Throws ForbiddenException if the user is not a member with one of the allowed roles,
  // or if the member has not yet accepted their invitation.
  private async assertMember(
    userId: string,
    businessId: string,
    roles: BusinessMemberRole[],
  ) {
    const member = await this.prisma.businessMember.findFirst({
      where: { businessId, userId, role: { in: roles } },
    });
    if (!member) {
      throw new ForbiddenException('Ou pa gen aksè pou biznis sa a');
    }
    // OWNER record is created with acceptedAt set; invited members must have accepted
    if (!member.acceptedAt) {
      throw new ForbiddenException('Ou dwe aksepte envitasyon an anvan');
    }
    return member;
  }

  // ── 1. Apply ──────────────────────────────────────────────────────────────

  async apply(userId: string, userEmail: string, userName: string | null, dto: ApplyBusinessDto) {
    await this.checkKyc(userId);

    // One business per user (as owner)
    const existing = await this.prisma.business.findFirst({
      where: { ownerId: userId },
    });
    if (existing) {
      throw new ConflictException('Ou gentan gen yon biznis aktif');
    }

    return this.prisma.$transaction(async (tx) => {
      const application = await tx.merchantApplication.create({
        data: {
          businessName: dto.businessName,
          email: userEmail,
          phone: dto.phone,
          address: dto.address,
          plan: dto.tier,
          tier: dto.tier,
          userId,
        },
      });

      const business = await tx.business.create({
        data: {
          businessName: dto.businessName,
          category: dto.category,
          tier: dto.tier,
          status: 'PENDING',
          ownerId: userId,
          applicationId: application.id,
        },
      });

      const wallet = await tx.businessWallet.create({
        data: { businessId: business.id },
      });

      // OWNER member record — already accepted (owner doesn't need to accept)
      await tx.businessMember.create({
        data: {
          businessId: business.id,
          userId,
          role: 'OWNER',
          acceptedAt: new Date(),
        },
      });

      return { business, wallet, application };
    });
  }

  // ── 2. Get my businesses ──────────────────────────────────────────────────

  async getMyBusinesses(userId: string) {
    // Businesses the user owns
    const owned = await this.prisma.business.findMany({
      where: { ownerId: userId },
      include: { wallet: true },
    });

    // Businesses the user is a member of (accepted invitation, not owner)
    const memberships = await this.prisma.businessMember.findMany({
      where: {
        userId,
        role: { not: 'OWNER' },
        acceptedAt: { not: null },
      },
      include: {
        business: { include: { wallet: true } },
      },
    });

    return {
      owned,
      member: memberships.map((m) => ({ ...m.business, memberRole: m.role })),
    };
  }

  // ── 3. Get wallet ─────────────────────────────────────────────────────────

  async getWallet(userId: string, businessId: string) {
    await this.assertMember(userId, businessId, ['OWNER', 'ACCOUNTANT']);

    const wallet = await this.prisma.businessWallet.findUnique({
      where: { businessId },
    });
    if (!wallet) throw new NotFoundException('BusinessWallet pa jwenn');

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [monthlyReceived, txCount] = await this.prisma.$transaction([
      this.prisma.businessTransaction.aggregate({
        where: {
          businessWalletId: wallet.id,
          type: 'PAYMENT_RECEIVED',
          status: 'COMPLETED',
          createdAt: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
      this.prisma.businessTransaction.count({
        where: { businessWalletId: wallet.id },
      }),
    ]);

    return {
      wallet,
      stats: {
        monthlyReceived: monthlyReceived._sum.amount ?? 0,
        transactionCount: txCount,
      },
    };
  }

  // ── 4. Get transactions ────────────────────────────────────────────────────

  async getTransactions(
    userId: string,
    businessId: string,
    page = 1,
    limit = 20,
  ) {
    const member = await this.assertMember(userId, businessId, ['OWNER', 'ACCOUNTANT', 'CASHIER']);

    const wallet = await this.prisma.businessWallet.findUnique({
      where: { businessId },
    });
    if (!wallet) throw new NotFoundException('BusinessWallet pa jwenn');

    const where: Prisma.BusinessTransactionWhereInput = {
      businessWalletId: wallet.id,
    };

    // CASHIER only sees today's transactions
    if (member.role === 'CASHIER') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      where.createdAt = { gte: startOfDay };
    }

    const skip = (page - 1) * limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.businessTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        include: {
          payer: { select: { name: true, email: true } },
        },
      }),
      this.prisma.businessTransaction.count({ where }),
    ]);

    return { data, total, page, limit, hasMore: skip + data.length < total };
  }

  // ── 5. Withdraw ───────────────────────────────────────────────────────────

  async withdraw(userId: string, businessId: string, dto: WithdrawDto) {
    await this.assertMember(userId, businessId, ['OWNER']);

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });
    if (!business) throw new NotFoundException('Biznis pa jwenn');
    if (business.status !== 'APPROVED') {
      throw new ForbiddenException(
        'Biznis ou a dwe apwouve anvan ou ka fè retrè',
      );
    }

    const wallet = await this.prisma.businessWallet.findUnique({
      where: { businessId },
    });
    if (!wallet) throw new NotFoundException('BusinessWallet pa jwenn');

    const amount = Number(dto.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new BadRequestException('Montan invalid');
    }

    const fee = this.round(amount * BUSINESS_WITHDRAW_FEE);
    const netAmount = this.round(amount - fee);
    const reference = `BWD-${uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase()}`;

    if (dto.destination === 'PERSONAL_WALLET') {
      return this.prisma.$transaction(
        async (tx) => {
          const current = await tx.businessWallet.findUnique({
            where: { businessId },
          });
          if (!current || Number(current.balance) < amount) {
            throw new BadRequestException('Balans biznis ensifizan');
          }

          await tx.businessWallet.update({
            where: { businessId },
            data: { balance: { decrement: amount } },
          });

          // Credit owner's personal wallet
          await tx.wallet.update({
            where: { userId },
            data: { balance: { increment: netAmount } },
          });

          const txRecord = await tx.businessTransaction.create({
            data: {
              businessWalletId: wallet.id,
              type: 'WITHDRAWAL',
              amount,
              fee,
              netAmount,
              reference,
              status: 'COMPLETED',
              description: `Retrè → Wallet pèsonèl (${netAmount} HTG net)`,
            },
          });

          return { success: true, transaction: txRecord };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    }

    // MONCASH or BANK — manual admin processing
    const current = await this.prisma.businessWallet.findUnique({
      where: { businessId },
    });
    if (!current || Number(current.balance) < amount) {
      throw new BadRequestException('Balans biznis ensifizan');
    }

    const txRecord = await this.prisma.businessTransaction.create({
      data: {
        businessWalletId: wallet.id,
        type: 'WITHDRAWAL',
        amount,
        fee,
        netAmount,
        reference,
        status: 'PENDING',
        description: dto.accountInfo
          ? `Retrè via ${dto.destination}: ${dto.accountInfo}`
          : `Retrè via ${dto.destination}`,
      },
    });

    return { success: true, transaction: txRecord, manual: true };
  }

  // ── 6. Invite member ──────────────────────────────────────────────────────

  async inviteMember(userId: string, businessId: string, dto: InviteMemberDto) {
    await this.assertMember(userId, businessId, ['OWNER']);

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });
    if (!business) throw new NotFoundException('Biznis pa jwenn');

    const invitee = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (!invitee) {
      throw new NotFoundException(
        'Moun sa a dwe gen yon kont OZAMAPAY pèsonèl anvan.',
      );
    }

    const existing = await this.prisma.businessMember.findUnique({
      where: { businessId_userId: { businessId, userId: invitee.id } },
    });
    if (existing) {
      throw new ConflictException('Moun sa a deja manm biznis sa a');
    }

    const member = await this.prisma.businessMember.create({
      data: {
        businessId,
        userId: invitee.id,
        role: dto.role,
      },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'https://ozamapay.com';
    try {
      await this.mailService.sendBusinessMemberInvitation(
        invitee.email,
        invitee.name || invitee.email,
        business.businessName,
        dto.role,
        `${frontendUrl}/business/accept/${member.id}`,
      );
    } catch {
      // Email failure is non-fatal — member record already created
    }

    return member;
  }

  // ── 7. Accept invitation ──────────────────────────────────────────────────

  async acceptInvitation(userId: string, memberId: string) {
    const member = await this.prisma.businessMember.findUnique({
      where: { id: memberId },
    });
    if (!member) throw new NotFoundException('Envitasyon pa jwenn');
    if (member.userId !== userId) {
      throw new ForbiddenException('Envitasyon sa a pa pou ou');
    }
    if (member.acceptedAt) {
      throw new BadRequestException('Ou deja aksepte envitasyon sa a');
    }

    return this.prisma.businessMember.update({
      where: { id: memberId },
      data: { acceptedAt: new Date() },
    });
  }

  // ── 8. Get members ────────────────────────────────────────────────────────

  async getMembers(userId: string, businessId: string) {
    await this.assertMember(userId, businessId, ['OWNER', 'ACCOUNTANT']);

    return this.prisma.businessMember.findMany({
      where: { businessId },
      include: {
        user: { select: { id: true, name: true, email: true, photoUrl: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ── 9. Remove member ──────────────────────────────────────────────────────

  async removeMember(userId: string, businessId: string, memberId: string) {
    await this.assertMember(userId, businessId, ['OWNER']);

    const member = await this.prisma.businessMember.findUnique({
      where: { id: memberId },
    });
    if (!member || member.businessId !== businessId) {
      throw new NotFoundException('Manm pa jwenn nan biznis sa a');
    }
    if (member.role === 'OWNER') {
      throw new BadRequestException('Ou pa ka retire pwòp tèt ou kòm pwopriyetè');
    }

    return this.prisma.businessMember.delete({ where: { id: memberId } });
  }

  // ── TODO: Payment integration point ──────────────────────────────────────
  // When a P2P transfer is made to a user who owns a Business, route the
  // credit to their BusinessWallet instead of personal Wallet, and create a
  // BusinessTransaction(type=PAYMENT_RECEIVED). This requires modifying
  // wallet.service.ts#transferP2P to check if the recipient has an
  // active (status=APPROVED) Business, and if so, credit the BusinessWallet.
  // Implement in Phase 3 after admin approval flows are built.
}
