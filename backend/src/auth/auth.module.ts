// src/auth/auth.module.ts

import { Module } from '@nestjs/common';

import { JwtModule } from '@nestjs/jwt';

import { PassportModule } from '@nestjs/passport';

import { AuthService } from './auth.service';

import { AuthController } from './auth.controller';

import { PrismaModule } from '../prisma/prisma.module';

import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PrismaModule,

    PassportModule,

    JwtModule.register({
      secret:
        process.env.JWT_SECRET ||
        'ozamapay_secret_super_long_2026',

      signOptions: {
        expiresIn: '30d',
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