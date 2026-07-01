// src/auth/auth.module.ts

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { TwoFactorService } from './two-factor.service';
import { TokenBlacklistService } from './token-blacklist.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { JwtStrategy } from './jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';

@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'google' }),
    MailModule, // Nou mete l nan imports yo pou NestJS ka rezoud MailService
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: '24h',
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TwoFactorService,
    TokenBlacklistService,
    JwtStrategy,
    GoogleStrategy,
  ],
  exports: [
    AuthService,
    TwoFactorService,
    TokenBlacklistService,
    JwtStrategy,
    JwtModule,
  ],
})
export class AuthModule {}