import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';

import { createHash, randomBytes, randomUUID } from 'crypto';

import { MailService } from '../mail/mail.service';
import { TwoFactorService } from './two-factor.service';
import { TokenBlacklistService } from './token-blacklist.service';

import { PrismaService } from '../prisma/prisma.service';

import {
  LoginDto,
  RegisterDto,
} from './dto/auth.dto';

import * as bcrypt from 'bcrypt';

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'];

// App mobil sèlman (header "X-Device-Id" prezan) — webapp pa janm pase nan
// chemen sa a, li kontinye ak yon sèl JWT 24h (signToken) san Session.
const MOBILE_ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 min
const MOBILE_REFRESH_TOKEN_TTL_DAYS = 30;

export interface DeviceInfo {
  deviceId: string;
  deviceName?: string;
  platform?: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,

    private jwtService: JwtService,

    private mailService: MailService,

    private twoFactorService: TwoFactorService,

    private tokenBlacklist: TokenBlacklistService,
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

                emailVerificationToken: verificationToken,
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

  async login(dto: LoginDto, ip?: string, userAgent?: string, deviceInfo?: DeviceInfo) {
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

    if (!user.password) {
      throw new UnauthorizedException(
        'Kont sa a te kreye ak Google. Klike sou "Konekte ak Google", oswa itilize "Mo Pas Bliye" pou defini yon modpas.',
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

    // Track admin session
    const ADMIN_SESSION_ROLES = ['ADMIN', 'SUPER_ADMIN', 'SUPPORT'];
    if (ADMIN_SESSION_ROLES.includes(user.role)) {
      await this.prisma.adminSession.updateMany({
        where: { userId: user.id, isActive: true },
        data: { isActive: false, logoutAt: new Date() },
      });
      await this.prisma.adminSession.create({
        data: {
          userId: user.id,
          ipAddress: ip ?? null,
          userAgent: userAgent ? userAgent.substring(0, 250) : null,
          isActive: true,
        },
      });
    }

    const userPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      referredByAgentId: user.referredByAgentId,
      transactionPin: user.transactionPin ? true : false,
      wallet: { balance: user.wallet?.balance || 0 },
      kyc: user.kyc
        ? { status: user.kyc.status, fullName: `${user.kyc.firstName} ${user.kyc.lastName}` }
        : null,
    };

    // App mobil (X-Device-Id prezan) — pè access/refresh token + Session.
    // Webapp (deviceInfo absan) kontinye egzakteman jan l te ye a, pi ba a.
    if (deviceInfo) {
      const pair = await this.issueTokenPair(user.id, user.email, user.role, deviceInfo);
      return {
        message: 'Koneksyon reyisi',
        ...pair,
        user: userPayload,
      };
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

      user: userPayload,
    };
  }

  // =========================
  // MOBILE SESSIONS — ISSUE/ROTATE/REVOKE (plan endpoints-app, lo L1)
  // =========================

  private hashRefreshToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  private async issueTokenPair(
    userId: string,
    email: string,
    role: string,
    deviceInfo: DeviceInfo,
  ) {
    const masterId = process.env.OZAMAPAY_MASTER_ID;
    const isMaster = masterId ? userId === masterId : false;

    const refreshToken = randomBytes(40).toString('hex');
    const refreshTokenHash = this.hashRefreshToken(refreshToken);
    const expiresAt = new Date(Date.now() + MOBILE_REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

    const session = await this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash,
        deviceId: deviceInfo.deviceId,
        deviceName: deviceInfo.deviceName ?? null,
        platform: deviceInfo.platform ?? null,
        ipAddress: deviceInfo.ipAddress ?? null,
        userAgent: deviceInfo.userAgent ? deviceInfo.userAgent.substring(0, 250) : null,
        expiresAt,
      },
    });

    const accessToken = this.jwtService.sign(
      { sub: userId, email, role, isMaster, jti: randomUUID(), sid: session.id },
      { expiresIn: MOBILE_ACCESS_TOKEN_TTL_SECONDS },
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: MOBILE_ACCESS_TOKEN_TTL_SECONDS,
    };
  }

  // Rotasyon + deteksyon reyitilizasyon : chak refresh token valab la
  // sèlman itilizab YON FWA. Si yon moun reprezante yon token ki te DEJA
  // woule (revokedReason === 'rotation'), sa vle di youn de 2 bagay — kliyan
  // lejitim ki repete yon rekèt (rezo), oswa yon vòl — nan tou de ka, pi
  // sekirize a se revoke tout chèn sesyon ki soti nan sa a.
  async refresh(refreshTokenRaw: string, deviceInfo?: DeviceInfo) {
    const refreshTokenHash = this.hashRefreshToken(refreshTokenRaw);
    const session = await this.prisma.session.findUnique({ where: { refreshTokenHash } });

    if (!session) {
      throw new UnauthorizedException('Refresh token envalid');
    }

    if (session.revokedAt) {
      if (session.revokedReason === 'rotation') {
        await this.revokeSessionChain(session.id, 'reuse_detected');
      }
      throw new UnauthorizedException('Refresh token envalid oswa deja revoke');
    }

    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token ekspire — reconnecte w tanpri');
    }

    const user = await this.prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || user.isSuspended) {
      throw new UnauthorizedException('Kont pa disponib');
    }

    const newRefreshToken = randomBytes(40).toString('hex');
    const newRefreshTokenHash = this.hashRefreshToken(newRefreshToken);
    const expiresAt = new Date(Date.now() + MOBILE_REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

    const newSession = await this.prisma.$transaction(async (tx) => {
      const created = await tx.session.create({
        data: {
          userId: session.userId,
          refreshTokenHash: newRefreshTokenHash,
          deviceId: deviceInfo?.deviceId ?? session.deviceId,
          deviceName: deviceInfo?.deviceName ?? session.deviceName,
          platform: deviceInfo?.platform ?? session.platform,
          ipAddress: deviceInfo?.ipAddress ?? session.ipAddress,
          userAgent: deviceInfo?.userAgent ? deviceInfo.userAgent.substring(0, 250) : session.userAgent,
          expiresAt,
        },
      });
      await tx.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date(), revokedReason: 'rotation', replacedBySessionId: created.id },
      });
      return created;
    });

    const masterId = process.env.OZAMAPAY_MASTER_ID;
    const isMaster = masterId ? user.id === masterId : false;
    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, role: user.role, isMaster, jti: randomUUID(), sid: newSession.id },
      { expiresIn: MOBILE_ACCESS_TOKEN_TTL_SECONDS },
    );

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: MOBILE_ACCESS_TOKEN_TTL_SECONDS,
    };
  }

  // Mache pandan chèn "replacedBySessionId" pou revoke tout sesyon desandan
  // ki soti nan yon refresh token ki sanble vòle (reyitilize apre rotasyon).
  private async revokeSessionChain(startSessionId: string, reason: string): Promise<void> {
    let currentId: string | null = startSessionId;
    const seen = new Set<string>();
    while (currentId && !seen.has(currentId)) {
      seen.add(currentId);
      const current = await this.prisma.session.findUnique({ where: { id: currentId } });
      if (!current) break;
      if (!current.revokedAt || current.revokedReason === 'rotation') {
        await this.prisma.session.update({
          where: { id: current.id },
          data: current.revokedAt ? {} : { revokedAt: new Date(), revokedReason: reason },
        });
      }
      currentId = current.replacedBySessionId;
    }
  }

  async listSessions(userId: string, currentSessionId?: string) {
    const sessions = await this.prisma.session.findMany({
      where: { userId, revokedAt: null },
      orderBy: { lastUsedAt: 'desc' },
    });

    return sessions.map((s) => ({
      id: s.id,
      deviceName: s.deviceName,
      platform: s.platform,
      ipAddress: s.ipAddress,
      createdAt: s.createdAt,
      lastUsedAt: s.lastUsedAt,
      current: s.id === currentSessionId,
    }));
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== userId) {
      throw new NotFoundException('Sesyon pa jwenn');
    }
    if (session.revokedAt) return;
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date(), revokedReason: 'manual' },
    });
  }

  async revokeAllSessions(userId: string, currentSessionId?: string, includeCurrent?: boolean): Promise<void> {
    await this.prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(includeCurrent ? {} : currentSessionId ? { id: { not: currentSessionId } } : {}),
      },
      data: { revokedAt: new Date(), revokedReason: 'revoke_all' },
    });
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
            state: user.kyc.state,
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

    const ADMIN_SESSION_ROLES = ['ADMIN', 'SUPER_ADMIN', 'SUPPORT'];
    if (ADMIN_SESSION_ROLES.includes(user.role)) {
      await this.prisma.adminSession.updateMany({
        where: { userId: user.id, isActive: true },
        data: { isActive: false, logoutAt: new Date() },
      });
      await this.prisma.adminSession.create({
        data: { userId: user.id, isActive: true },
      });
    }

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

  async logoutAdmin(userId: string) {
    await this.prisma.adminSession.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false, logoutAt: new Date() },
    });
    return { message: 'Déconnecté avec succès' };
  }

  async invalidateToken(jti: string, exp: number): Promise<void> {
    await this.tokenBlacklist.add(jti, exp);
  }

  signToken(userId: string, email: string, role: string): string {
    const masterId = process.env.OZAMAPAY_MASTER_ID;
    const isMaster = masterId ? userId === masterId : false;
    return this.jwtService.sign({ sub: userId, email, role, isMaster, jti: randomUUID() });
  }
}