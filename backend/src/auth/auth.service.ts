import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';

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

    // 🔥 Agent referral
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

    const hashedPassword =
      await bcrypt.hash(
        dto.password,
        10,
      );

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
              },
            });

          await tx.wallet.create({
            data: {
              userId: newUser.id,
              balance: 0,
            },
          });

          return newUser;
        },
      );

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
      message: 'Koneksyon reyisi',

      token,

      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,

        referredByAgentId:
          user.referredByAgentId,

        wallet: {
          balance:
            user.wallet?.balance || 0,
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
    };
  }

  // =========================
  // TOKEN
  // =========================
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