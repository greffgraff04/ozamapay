// src/auth/jwt.strategy.ts

import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { PassportStrategy } from '@nestjs/passport';

import {
  ExtractJwt,
  Strategy,
} from 'passport-jwt';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest:
        ExtractJwt.fromAuthHeaderAsBearerToken(),

      ignoreExpiration: false,

      secretOrKey:
        process.env.JWT_SECRET ||
        'ozamapay_secret_super_long_2026',
    });
  }

  async validate(payload: {
    sub: string;
    email: string;
    role: string;
  }) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: payload.sub,
      },

      include: {
        wallet: true,
        kyc: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException(
        'Token pa valid',
      );
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,

      wallet: user.wallet,

      kyc: user.kyc,
    };
  }
}