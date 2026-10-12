import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomInt } from 'crypto';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { AuthService, DeviceInfo } from './auth.service';
import { SendOtpDto, VerifyOtpDto } from './dto/auth.dto';

const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
// "3 par 10 min par compte" (en plus du Throttle par IP sur la route) —
// compté directement sur OtpCode.createdAt, pas besoin d'une table en plus.
const OTP_MAX_SENDS_PER_WINDOW = 3;
const OTP_RATE_LIMIT_WINDOW_MINUTES = 10;

type OtpPurposeUpper = 'REGISTER' | 'NEW_DEVICE' | 'RESET';

interface ResolvedIdentity {
  userId: string | null;
  deviceInfo?: DeviceInfo;
}

@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  private async resolveIdentity(
    purpose: OtpPurposeUpper,
    dto: { email?: string; challengeToken?: string },
    authHeader?: string,
  ): Promise<ResolvedIdentity> {
    if (purpose === 'REGISTER') {
      // App mobil (plan endpoints-app, lo L3) — /auth/register pa bay
      // okenn token tout tan email pa verifye, donk idantite a soti nan
      // challengeToken a, menm chemen ak NEW_DEVICE.
      if (dto.challengeToken) {
        const { userId, deviceInfo } = await this.authService.verifyChallengeToken(dto.challengeToken);
        return { userId, deviceInfo };
      }
      // Chemen altènatif (webapp/ansyen app ki ta deja gen yon Bearer) —
      // pa itilize pou kounye a men rete disponib san danje.
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
      if (!token) throw new UnauthorizedException('Konekte anvan ou mande yon kòd');
      let payload: any;
      try {
        payload = this.jwtService.verify(token);
      } catch {
        throw new UnauthorizedException('Sesyon ekspire — rekonekte w');
      }
      return { userId: payload.sub };
    }

    if (purpose === 'NEW_DEVICE') {
      if (!dto.challengeToken) throw new BadRequestException('challengeToken obligatwa');
      const { userId, deviceInfo } = await this.authService.verifyChallengeToken(dto.challengeToken);
      return { userId, deviceInfo };
    }

    // RESET — anti-enumerasyon : jwenn oswa pa, menm repons jenerik pi ba.
    if (!dto.email) throw new BadRequestException('email obligatwa');
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    return { userId: user?.id ?? null };
  }

  async send(dto: SendOtpDto, authHeader?: string): Promise<{ message: string }> {
    const purpose = dto.purpose.toUpperCase() as OtpPurposeUpper;
    const { userId, deviceInfo } = await this.resolveIdentity(purpose, dto, authHeader);
    const generic = { message: 'Si demand lan valid, yon kòd te voye pa email.' };

    // RESET sou yon email ki pa egziste — pa kreye OTP, pa voye email,
    // menm repons jenerik (menm pwensip ak AuthService.forgotPassword).
    if (!userId) return generic;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return generic;

    const windowStart = new Date(Date.now() - OTP_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);
    const recentCount = await this.prisma.otpCode.count({
      where: { userId, purpose, createdAt: { gte: windowStart } },
    });
    if (recentCount >= OTP_MAX_SENDS_PER_WINDOW) {
      throw new HttpException('Twòp demann kòd — eseye ankò nan kèk minit', HttpStatus.TOO_MANY_REQUESTS);
    }

    // Envalide tout ansyen kòd pa konsome pou menm (userId, purpose) —
    // yon sèl kòd aktif alafwa.
    await this.prisma.otpCode.updateMany({
      where: { userId, purpose, consumedAt: null },
      data: { consumedAt: new Date() },
    });

    // crypto.randomInt — jamè Math.random() pou yon kòd sekirite.
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await this.prisma.otpCode.create({
      data: { userId, purpose, codeHash, expiresAt, maxAttempts: OTP_MAX_ATTEMPTS },
    });

    // `code` pase SÈLMAN nan email la — jamè nan yon log, jamè nan repons
    // API la (menm an staging).
    await this.mailService.sendOtpCode(user.email, user.name || 'Kliyan', code, purpose);

    void deviceInfo; // pa itilize isit la — sèlman verify() bezwen l

    return generic;
  }

  async verify(dto: VerifyOtpDto, authHeader?: string): Promise<any> {
    const purpose = dto.purpose.toUpperCase() as OtpPurposeUpper;
    const { userId, deviceInfo } = await this.resolveIdentity(purpose, dto, authHeader);

    if (!userId) throw new BadRequestException('Kòd envalid');

    const otp = await this.prisma.otpCode.findFirst({
      where: { userId, purpose, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) throw new BadRequestException('Kòd envalid oswa ekspire');
    if (otp.expiresAt < new Date()) throw new BadRequestException('Kòd ekspire — mande yon nouvo kòd');
    if (otp.attempts >= otp.maxAttempts) {
      throw new BadRequestException('Twòp tantativ — mande yon nouvo kòd');
    }

    const match = await bcrypt.compare(dto.code, otp.codeHash);
    if (!match) {
      await this.prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: otp.attempts + 1 } });
      throw new BadRequestException('Kòd envalid');
    }

    await this.prisma.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });

    if (purpose === 'REGISTER') {
      await this.prisma.user.update({
        where: { id: userId },
        data: { emailVerified: true, emailVerificationToken: null },
      });

      // App mobil (challengeToken, deviceInfo prezan) — kounye a ke email
      // la verifye, aparèy la vin "konni" (Session kreye) e app la resevwa
      // vrè pè token li t ap tann depi /auth/register — plan endpoints-app,
      // lo L3. Chemen Bearer (webapp/altènatif, pa gen deviceInfo) kontinye
      // egzakteman jan l te ye nan lo L2.
      if (deviceInfo) {
        return this.authService.completeDeviceVerification(userId, deviceInfo);
      }
      return { message: 'Email konfime', emailVerified: true };
    }

    if (purpose === 'NEW_DEVICE') {
      if (!deviceInfo) throw new BadRequestException('challengeToken envalid');
      return this.authService.completeDeviceVerification(userId, deviceInfo);
    }

    // RESET — jwenn chemen EGZAK /auth/reset-password deja itilize a, san
    // modifye okenn liy nan li : menm User.resetPasswordToken/Expires.
    const crypto = await import('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: new Date(Date.now() + 3_600_000),
      },
    });
    return { message: 'Kòd konfime', resetToken };
  }
}
