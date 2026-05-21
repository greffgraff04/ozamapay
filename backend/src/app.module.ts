import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller'; // ← AJOUTE SA
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { WalletModule } from './wallet/wallet.module';
import { KycModule } from './kyc/kyc.module';
import { AdminModule } from './admin/admin.module';
import { RatesModule } from './rates/rates.module';
import { PaymentsModule } from './payments/payments.module'; 
import { StrowalletModule } from './strowallet/strowallet.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 10,
    }]),
    PrismaModule,
    UsersModule,
    AuthModule,
    WalletModule,
    KycModule,
    AdminModule,
    RatesModule,
    PaymentsModule,
    StrowalletModule,
  ],
  controllers: [AppController], // ← AJOUTE SA
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}