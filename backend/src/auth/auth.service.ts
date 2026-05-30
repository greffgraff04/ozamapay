import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
 NotFoundException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';

import { randomBytes } from 'crypto';

import { MailService } from '../mail/mail.service';

import { PrismaService } from '../prisma/prisma.service';

import {
  LoginDto,
  RegisterDto,
} from './dto/auth.dto';

import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,

    private jwtService: JwtService,

    private mailService: MailService,
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
    const user =
      await this.prisma.user.findUnique({
        where: {
          email:
            dto.email.toLowerCase(),
        },

        include: {
          wallet: true,

          kyc: true,
        },
      });

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
      throw new UnauthorizedException(
        'Email oswa modpas enkòrèk',
      );
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
            status:
              user.kyc.status,
          }
        : null,

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

  private signToken(
    userId: string,

    email: string,

    role: string,
  ): string {
    return this.jwtService.sign({
      sub: userId,

      email,

      role,
    });
  }
}