import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';

import { randomBytes } from 'crypto';

import { MailService } from '../mail/mail.service';
import { TwoFactorService } from './two-factor.service';

import { PrismaService } from '../prisma/prisma.service';

import {
  LoginDto,
  RegisterDto,
} from './dto/auth.dto';

import * as bcrypt from 'bcrypt';

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'];

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,

    private jwtService: JwtService,

    private mailService: MailService,

    private twoFactorService: TwoFactorService,
  ) {}

  // =========================
  // REGISTER
  // =========================

  async register(dto: RegisterDto) {
    const existing =
      await this.prisma.user.findUnique({
        where: {
          email:
            dto.email.toLowerCase(),
        },
      });

    if (existing) {
      throw new ConflictException(
        'Email deja itilize',
      );
    }

    if (dto.password.length < 6) {
      throw new BadRequestException(
        'Modpas la dwe gen minimum 6 karaktè',
      );
    }

    // =========================
    // AGENT REFERRAL
    // =========================

    let referredByAgentId:
      | string
      | null = null;

    if (dto.agentCode) {
      const agent =
        await this.prisma.agent.findUnique(
          {
            where: {
              agentCode:
                dto.agentCode,
            },
          },
        );

      if (!agent) {
        throw new BadRequestException(
          'Code agent invalide',
        );
      }

      referredByAgentId = agent.id;
    }

    // =========================
    // HASH PASSWORD
    // =========================

    const hashedPassword =
      await bcrypt.hash(
        dto.password,
        10,
      );

    // =========================
    // EMAIL VERIFICATION TOKEN
    // =========================

    const verificationToken =
      randomBytes(32).toString(
        'hex',
      );

    // =========================
    // CREATE USER
    // =========================

    const user =
      await this.prisma.$transaction(
        async (tx) => {
          const newUser =
            await tx.user.create({
              data: {
                email:
                  dto.email.toLowerCase(),

                password:
                  hashedPassword,

                name: dto.name,

                role: 'USER',

                referredByAgentId,

                //emailVerificationToken: verificationToken,
              },
            });

          // =========================
          // CREATE WALLET
          // =========================

          await tx.wallet.create({
            data: {
              userId: newUser.id,

              balance: 0,
            },
          });

          return newUser;
        },
      );

    // Emails sent outside transaction so failures don't roll back user creation
    await this.mailService.sendVerificationEmail(user.email, verificationToken);
    await this.mailService.sendWelcome(user.email, user.name || 'Kliyan');

    // =========================
    // JWT TOKEN
    // =========================

    const token = this.signToken(
      user.id,

      user.email,

      user.role,
    );

    return {
      message:
        'Kont kreye avèk siksè',

      token,

      user: {
        id: user.id,

        email: user.email,

        name: user.name,

        role: user.role,

        referredByAgentId:
          user.referredByAgentId,

        transactionPin:
          user.transactionPin
            ? true
            : false,
      },
    };
  }

  // =========================
  // LOGIN
  // =========================

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase();
    const now = new Date();

    const user =
      await this.prisma.user.findUnique({
        where: { email },

        include: {
          wallet: true,

          kyc: true,
        },
      });

    // Prevent timing-based user enumeration: check lock even if user not found
    if (user?.loginLockedUntil && user.loginLockedUntil > now) {
      throw new ForbiddenException('Kont ou bloke pou 15 minit. Eseye ankò pita.');
    }

    if (user?.loginLockedUntil && user.loginLockedUntil <= now) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, loginLockedUntil: null },
      });
      user.failedLoginAttempts = 0;
      user.loginLockedUntil = null;
    }

    if (!user) {
      throw new UnauthorizedException(
        'Email oswa modpas enkòrèk',
      );
    }

    const passwordMatch =
      await bcrypt.compare(
        dto.password,

        user.password,
      );

    if (!passwordMatch) {
      const newCount = user.failedLoginAttempts + 1;
      const lockUntil = newCount >= 5 ? new Date(now.getTime() + 15 * 60 * 1000) : null;
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: newCount, loginLockedUntil: lockUntil },
      });
      if (lockUntil) {
        throw new ForbiddenException('Kont ou bloke pou 15 minit. Eseye ankò pita.');
      }
      throw new UnauthorizedException(
        'Email oswa modpas enkòrèk',
      );
    }

    // Successful login — reset attempt counter
    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, loginLockedUntil: null },
    });

    // Daily-code check for admin accounts
    if (ADMIN_ROLES.includes(user.role)) {
      const activeCode = await this.prisma.dailyAccessCode.findFirst({
        where: { isActive: true, expiresAt: { gt: new Date() } },
      });
      // Only enforce once a code has been generated (prevents lockout on fresh deploy)
      if (activeCode) {
        console.log('Stored code:', JSON.stringify(activeCode.code));
        console.log('Submitted code:', JSON.stringify(dto.dailyCode?.toUpperCase()));
        if (!dto.dailyCode || activeCode.code !== dto.dailyCode.toUpperCase()) {
          throw new UnauthorizedException('Code journalier invalide');
        }
      }
    }

    if (ADMIN_ROLES.includes(user.role) && user.twoFactorEnabled) {
      const tempToken = this.jwtService.sign(
        { sub: user.id, email: user.email, role: user.role, is2FATemp: true },
        { expiresIn: '15m' },
      );
      return { requires2FA: true, tempToken };
    }

    const token = this.signToken(
      user.id,

      user.email,

      user.role,
    );

    return {
      message:
        'Koneksyon reyisi',

      token,

      user: {
        id: user.id,

        email: user.email,

        name: user.name,

        role: user.role,

        referredByAgentId:
          user.referredByAgentId,

        transactionPin:
          user.transactionPin
            ? true
            : false,

        wallet: {
          balance:
            user.wallet?.balance ||
            0,
        },

        kyc: user.kyc
          ? {
              status:
                user.kyc.status,

              fullName: `${user.kyc.firstName} ${user.kyc.lastName}`,
            }
          : null,
      },
    };
  }

  // =========================
  // GET ME
  // =========================

  async getMe(userId: string) {
    const user =
      await this.prisma.user.findUnique({
        where: {
          id: userId,
        },

        include: {
          wallet: true,

          kyc: true,

          agent: true,
        },
      });

    if (!user) {
      throw new NotFoundException(
        'Itilizatè sa a pa egziste.',
      );
    }

    return {
      id: user.id,

      email: user.email,

      name: user.name,

      phone: user.phone,

      role: user.role,

      transactionPin:
        user.transactionPin
          ? true
          : false,

      referredByAgentId:
        user.referredByAgentId,

      wallet: user.wallet
        ? {
            balance:
              user.wallet.balance,
          }
        : null,

      kyc: user.kyc
        ? {
            status: user.kyc.status,
            line1: user.kyc.line1,
            city: user.kyc.city,
            zipCode: user.kyc.zipCode,
            country: user.kyc.country,
          }
        : null,

      photoUrl: user.photoUrl || null,

      agent: user.agent
        ? {
            status: user.agent.status,
            agentCode: user.agent.agentCode,
            level: user.agent.level,
          }
        : null,
    };
  }

  // =========================
  // JWT TOKEN
  // =========================

  // =========================
  // FORGOT PASSWORD
  // =========================

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return same message to prevent email enumeration
    if (!user) return { message: 'Si email sa a egziste, nou voye yon lyen reset' };

    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3_600_000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordToken: token, resetPasswordExpires: expires },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'https://ozamapay.com';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
    await this.mailService.sendPasswordReset(user.email, user.name || 'Kliyan', resetUrl);

    return { message: 'Si email sa a egziste, nou voye yon lyen reset' };
  }

  // =========================
  // RESET PASSWORD
  // =========================

  async resetPassword(token: string, newPassword: string) {
    if (!token || !newPassword) {
      throw new BadRequestException('Token ak nouvo modpas obligatwa');
    }
    if (newPassword.length < 6) {
      throw new BadRequestException('Modpas la dwe gen minimum 6 karaktè');
    }

    const user = await this.prisma.user.findFirst({
      where: { resetPasswordToken: token },
    });

    if (!user) throw new BadRequestException('Token la pa valid');
    if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      throw new BadRequestException('Token la ekspire. Mande yon nouvo lyen reset.');
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    return { message: 'Modpas ou chanje avèk siksè. Ou ka konekte kounye a.' };
  }

  // =========================
  // 2FA SETUP
  // =========================

  async setup2FA(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Itilizatè sa a pa egziste.');
    if (!ADMIN_ROLES.includes(user.role)) {
      throw new ForbiddenException('2FA disponib sèlman pou admin');
    }

    const { secret, otpAuthUrl } = this.twoFactorService.generateSecret(user.email);

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });

    const qrCodeUrl = await this.twoFactorService.generateQrCode(otpAuthUrl);
    return { secret, qrCodeUrl };
  }

  // =========================
  // 2FA ENABLE
  // =========================

  async enable2FA(userId: string, token: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Itilizatè sa a pa egziste.');
    if (!user.twoFactorSecret) {
      throw new BadRequestException('Ou dwe kòmanse setup 2FA anvan');
    }

    if (!this.twoFactorService.verifyToken(user.twoFactorSecret, token)) {
      throw new BadRequestException('Kòd TOTP enkòrèk');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    return { message: '2FA aktive avèk siksè' };
  }

  // =========================
  // 2FA COMPLETE LOGIN
  // =========================

  async complete2FA(tempToken: string, totpCode: string) {
    let payload: { sub: string; email: string; role: string; is2FATemp?: boolean };
    try {
      payload = this.jwtService.verify(tempToken);
    } catch {
      throw new UnauthorizedException('Token ekspire oswa envalid');
    }

    if (!payload.is2FATemp) {
      throw new UnauthorizedException('Token envalid');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { wallet: true, kyc: true },
    });

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new UnauthorizedException('Kont 2FA pa aktive');
    }

    if (!this.twoFactorService.verifyToken(user.twoFactorSecret, totpCode)) {
      throw new UnauthorizedException('Kòd TOTP enkòrèk');
    }

    const token = this.signToken(user.id, user.email, user.role);

    return {
      message: 'Koneksyon reyisi',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        referredByAgentId: user.referredByAgentId,
        transactionPin: user.transactionPin ? true : false,
        wallet: { balance: user.wallet?.balance || 0 },
        kyc: user.kyc ? { status: user.kyc.status } : null,
      },
    };
  }

  signToken(userId: string, email: string, role: string): string {
    const masterId = process.env.OZAMAPAY_MASTER_ID;
    const isMaster = masterId ? userId === masterId : false;
    return this.jwtService.sign({ sub: userId, email, role, isMaster });
  }
}