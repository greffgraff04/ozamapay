// src/auth/auth.module.ts

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module'; // Nou ajoute enpòtasyon MailModule la
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    MailModule, // Nou mete l nan imports yo pou NestJS ka rezoud MailService
    JwtModule.register({
      secret:
        process.env.JWT_SECRET ||
        'ozamapay_secret_super_long_2026',
      signOptions: {
        expiresIn: '7d',
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
  ],
  exports: [
    AuthService,
    JwtStrategy,
    JwtModule,
  ],
})
export class AuthModule {}