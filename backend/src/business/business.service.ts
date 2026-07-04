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
import * as bcrypt from 'bcrypt';
import { createHash, createHmac, randomBytes } from 'crypto';
import { ApiService } from '../api/api.service';

// ── Named constants — easy to tune ────────────────────────────────────────
const BUSINESS_WITHDRAW_FEE = 0.015; // 1.5%

const BUSINESS_PAYMENT_FEE: Record<string, number> = {
  STARTER:    0.025, // 2.5%
  PRO:        0.020, // 2.0%
  ENTERPRISE: 0.015, // 1.5%
};

const MASTER_ID = process.env.OZAMAPAY_MASTER_ID as string;

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
  pin: string;
}

export class InviteMemberDto {
  email: string;
  role: 'ACCOUNTANT' | 'CASHIER';
}

export class CreateApiKeyDto {
  name: string;
  mode: 'LIVE' | 'TEST';
  permissions?: ('READ' | 'WRITE' | 'WEBHOOK')[];
}

export class CreateBizWebhookDto {
  url: string;
  events: string[];
}

const API_TIERS = ['PRO', 'ENTERPRISE'];

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class BusinessService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private apiService: ApiService,
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
      include: { wallet: true, application: { select: { adminNote: true } } },
    });

    // Businesses the user is a member of (accepted invitation, not owner)
    const memberships = await this.prisma.businessMember.findMany({
      where: {
        userId,
        role: { not: 'OWNER' },
        acceptedAt: { not: null },
      },
      include: {
        business: { include: { wallet: true, application: { select: { adminNote: true } } } },
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

    const owner = await this.prisma.user.findUnique({ where: { id: userId } });
    const pinValid = owner?.transactionPin && await bcrypt.compare(dto.pin ?? '', owner.transactionPin);
    if (!pinValid) {
      throw new BadRequestException('Kòd PIN sekirite a enkòrèk. Retrè bloke!');
    }

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

          // Credit fee to master wallet
          if (fee > 0) {
            await tx.wallet.update({
              where: { userId: MASTER_ID },
              data: { balance: { increment: fee } },
            });
          }

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

    // MONCASH or BANK — manual admin processing.
    // Reserve the full amount now (mirrors PERSONAL_WALLET) so admin
    // approve/reject later can settle or refund without ever creating or
    // destroying balance: approve credits the fee to master, reject
    // refunds this same amount back to the business wallet.
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

        const txRecord = await tx.businessTransaction.create({
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
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
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

  // ── 7. Invitation preview (pou paj akseptasyon frontend la) ─────────────────

  async getInvitationPreview(userId: string, memberId: string) {
    const member = await this.prisma.businessMember.findUnique({
      where: { id: memberId },
      include: { business: { select: { businessName: true } } },
    });
    if (!member) throw new NotFoundException('Envitasyon pa jwenn');
    if (member.userId !== userId) throw new ForbiddenException('Envitasyon sa a pa pou ou');
    return {
      businessName: member.business.businessName,
      role: member.role,
      invitedAt: member.invitedAt,
      alreadyAccepted: !!member.acceptedAt,
    };
  }

  // ── 8. Accept invitation ──────────────────────────────────────────────────

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

  // ── Public info (no auth) ─────────────────────────────────────────────────

  async getPublicInfo(businessId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, businessName: true, category: true, tier: true, status: true },
    });
    if (!business) throw new NotFoundException('Biznis pa jwenn');
    return business;
  }

  // Lets the payer's browser resolve a Developer API payment link
  // (POST /api/v1/payments/initiate → paymentUrl) without needing an API key.
  async getPublicApiPayment(paymentId: string) {
    const payment = await this.prisma.apiPayment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        amount: true,
        description: true,
        status: true,
        business: { select: { businessName: true } },
      },
    });
    if (!payment) throw new NotFoundException('Peman pa jwenn');
    return {
      paymentId: payment.id,
      amount: payment.amount,
      description: payment.description,
      status: payment.status,
      businessName: payment.business.businessName,
    };
  }

  // ── Pay business (authenticated payer) ───────────────────────────────────

  async payBusiness(payerId: string, businessId: string, amount: number, pin: string, apiPaymentId?: string) {
    if (isNaN(amount) || amount <= 0) {
      throw new BadRequestException('Montan invalid');
    }

    // Verify payer PIN
    const payer = await this.prisma.user.findUnique({ where: { id: payerId } });
    if (!payer) throw new NotFoundException('Itilizatè pa jwenn');
    const pinValid = payer.transactionPin && await bcrypt.compare(pin, payer.transactionPin);
    if (!pinValid) {
      throw new BadRequestException('Kòd PIN sekirite a enkòrèk. Tranzaksyon bloke!');
    }

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      include: { wallet: true },
    });
    if (!business) throw new NotFoundException('Biznis pa jwenn');
    if (business.status !== 'APPROVED') {
      throw new ForbiddenException('Biznis sa a pa aktif pou kounye a');
    }
    if (!business.wallet) throw new NotFoundException('BusinessWallet pa jwenn');

    // If this payment is settling a Developer API payment link, validate it
    // matches before touching any money.
    let apiPayment: { id: string; amount: any; fee: any } | null = null;
    if (apiPaymentId) {
      const found = await this.prisma.apiPayment.findUnique({ where: { id: apiPaymentId } });
      if (!found || found.businessId !== businessId) {
        throw new NotFoundException('Peman API pa jwenn');
      }
      if (found.status !== 'PENDING') {
        throw new BadRequestException('Peman sa a deja trete');
      }
      if (Number(found.amount) !== Number(amount)) {
        throw new BadRequestException('Montan pa matche ak peman API la');
      }
      apiPayment = found;
    }

    const feeRate = BUSINESS_PAYMENT_FEE[business.tier] ?? BUSINESS_PAYMENT_FEE.STARTER;
    const fee = this.round(amount * feeRate);
    const netAmount = this.round(amount - fee);
    const reference = `BPAY-${uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase()}`;

    const result = await this.prisma.$transaction(
      async (tx) => {
        // Check payer balance
        const payerWallet = await tx.wallet.findUnique({ where: { userId: payerId } });
        if (!payerWallet || Number(payerWallet.balance) < amount) {
          throw new BadRequestException('Balans ensifizan');
        }

        // Debit payer personal wallet
        await tx.wallet.update({
          where: { userId: payerId },
          data: { balance: { decrement: amount } },
        });

        // Credit business wallet with net amount
        await tx.businessWallet.update({
          where: { id: business.wallet!.id },
          data: { balance: { increment: netAmount } },
        });

        // Credit fee to master wallet
        if (fee > 0) {
          await tx.wallet.update({
            where: { userId: MASTER_ID },
            data: { balance: { increment: fee } },
          });
        }

        // BusinessTransaction record (business-side ledger)
        await tx.businessTransaction.create({
          data: {
            businessWalletId: business.wallet!.id,
            type: 'PAYMENT_RECEIVED',
            amount,
            fee,
            netAmount,
            reference,
            status: 'COMPLETED',
            payerUserId: payerId,
            description: `Peman de ${payer.name || payer.email}`,
          },
        });

        // Personal Transaction record so payer sees it in their history
        const personalTx = await tx.transaction.create({
          data: {
            reference: `${reference}-P`,
            senderWalletId: payerWallet.id,
            amount,
            fee,
            netAmount,
            type: 'TRANSFER',
            status: 'COMPLETED',
            method: 'OZAMAPAY_BUSINESS',
            title: `Peman bay ${business.businessName}`,
            description: `Ou peye ${amount} HTG bay biznis ${business.businessName}`,
          },
        });

        if (apiPayment) {
          await tx.apiPayment.update({
            where: { id: apiPayment.id },
            data: { status: 'COMPLETED', paidAt: new Date(), payerUserId: payerId },
          });
        }

        return { success: true, reference, transaction: personalTx };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if (apiPayment) {
      this.apiService.fireWebhooks(businessId, 'payment.received', {
        paymentId: apiPayment.id,
        amount,
        fee,
        status: 'COMPLETED',
      }).catch(() => {});
    }

    return result;
  }

  // ── API Keys (developer API — dashboard management) ───────────────────────

  private async assertApiTier(businessId: string) {
    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw new NotFoundException('Biznis pa jwenn');
    if (business.status !== 'APPROVED') {
      throw new ForbiddenException('Biznis ou a dwe apwouve anvan ou ka jere API');
    }
    if (!API_TIERS.includes(business.tier)) {
      throw new ForbiddenException('Aksè API disponib sèlman pou plan PRO ak ENTERPRISE');
    }
    return business;
  }

  async listApiKeys(userId: string, businessId: string) {
    await this.assertMember(userId, businessId, ['OWNER']);
    const keys = await this.prisma.apiKey.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });
    return keys.map((k) => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      mode: k.mode,
      permissions: k.permissions,
      isActive: k.isActive,
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt,
      revokedAt: k.revokedAt,
    }));
  }

  async createApiKey(userId: string, businessId: string, dto: CreateApiKeyDto) {
    await this.assertMember(userId, businessId, ['OWNER']);
    await this.assertApiTier(businessId);

    if (!dto.name?.trim()) throw new BadRequestException('Non kle a obligatwa');
    const mode = dto.mode === 'TEST' ? 'TEST' : 'LIVE';
    const permissions = dto.permissions?.length ? dto.permissions : (['READ', 'WRITE', 'WEBHOOK'] as const);

    const secretPart = randomBytes(32).toString('hex');
    const fullKey = `ozpk_${mode.toLowerCase()}_${secretPart}`;
    const keyHash = createHash('sha256').update(fullKey).digest('hex');
    const keyPrefix = fullKey.slice(0, 18);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        businessId,
        name: dto.name.trim(),
        keyPrefix,
        keyHash,
        mode,
        permissions: permissions as any,
        isActive: true,
      },
    });

    return {
      id: apiKey.id,
      name: apiKey.name,
      mode: apiKey.mode,
      permissions: apiKey.permissions,
      key: fullKey, // shown once — never retrievable again after this response
      keyPrefix: apiKey.keyPrefix,
      createdAt: apiKey.createdAt,
    };
  }

  async revokeApiKey(userId: string, businessId: string, keyId: string) {
    await this.assertMember(userId, businessId, ['OWNER']);
    const key = await this.prisma.apiKey.findUnique({ where: { id: keyId } });
    if (!key || key.businessId !== businessId) throw new NotFoundException('API Key pa jwenn');
    await this.prisma.apiKey.update({
      where: { id: keyId },
      data: { isActive: false, revokedAt: new Date() },
    });
    return { success: true };
  }

  // ── Webhooks (developer API — dashboard management) ───────────────────────

  async listBusinessWebhooks(userId: string, businessId: string) {
    await this.assertMember(userId, businessId, ['OWNER']);
    return this.prisma.webhookEndpoint.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createBusinessWebhook(userId: string, businessId: string, dto: CreateBizWebhookDto) {
    await this.assertMember(userId, businessId, ['OWNER']);
    await this.assertApiTier(businessId);

    if (!dto.url || !/^https:\/\//.test(dto.url)) {
      throw new BadRequestException('URL webhook dwe kòmanse ak https://');
    }
    const secret = `whsec_${randomBytes(24).toString('hex')}`;
    return this.prisma.webhookEndpoint.create({
      data: { businessId, url: dto.url, events: dto.events || [], secret },
    });
  }

  async removeBusinessWebhook(userId: string, businessId: string, webhookId: string) {
    await this.assertMember(userId, businessId, ['OWNER']);
    const wh = await this.prisma.webhookEndpoint.findUnique({ where: { id: webhookId } });
    if (!wh || wh.businessId !== businessId) throw new NotFoundException('Webhook pa jwenn');
    await this.prisma.webhookEndpoint.delete({ where: { id: webhookId } });
    return { success: true };
  }

  async testBusinessWebhook(userId: string, businessId: string, webhookId: string) {
    await this.assertMember(userId, businessId, ['OWNER']);
    const wh = await this.prisma.webhookEndpoint.findUnique({ where: { id: webhookId } });
    if (!wh || wh.businessId !== businessId) throw new NotFoundException('Webhook pa jwenn');

    const body = JSON.stringify({
      event: 'test.ping',
      businessId,
      message: 'Sa se yon evènman tès ki soti nan OZAMAPAY Business',
      timestamp: new Date().toISOString(),
    });
    const signature = createHmac('sha256', wh.secret).update(body).digest('hex');

    try {
      const res = await fetch(wh.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Ozamapay-Signature': signature },
        body,
      });
      return { success: res.ok, statusCode: res.status };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Rekèt la echwe' };
    }
  }
}
