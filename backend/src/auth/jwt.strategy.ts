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
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required');
    }

    super({
      jwtFromRequest:
        ExtractJwt.fromAuthHeaderAsBearerToken(),

      ignoreExpiration: false,

      secretOrKey: jwtSecret,
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

    if (user.isSuspended) {
      throw new UnauthorizedException('Kont ou a sispan. Kontakte sipò.');
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