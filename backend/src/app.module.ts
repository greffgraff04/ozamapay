import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { SentryModule } from '@sentry/nestjs/setup';
import { AppController } from './app.controller';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { WalletModule } from './wallet/wallet.module';
import { KycModule } from './kyc/kyc.module';
import { AdminModule } from './admin/admin.module';
import { RatesModule } from './rates/rates.module';
import { PaymentsModule } from './payments/payments.module';
import { StrowalletModule } from './strowallet/strowallet.module';
import { AgentsModule } from './agents/agents.module';
import { CommissionsModule } from './commissions/commissions.module';
import { MailModule } from './mail/mail.module';
import { HealthModule } from './health/health.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { MerchantModule } from './merchant/merchant.module';
import { GiftCardsModule } from './giftcards/giftcards.module';
import { ReloadlyAuthModule } from './reloadly/reloadly-auth.module';
import { AirtimeModule } from './airtime/airtime.module';
import { TrackingModule } from './tracking/tracking.module';
import { BusinessModule } from './business/business.module';
import { ApiModule } from './api/api.module';
import { TeamModule } from './team/team.module';
import { TronModule } from './tron/tron.module';

@Module({
  imports: [
    SentryModule.forRoot(),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 60000, limit: 100 },
      { name: 'long', ttl: 3600000, limit: 1000 },
      { name: 'apiDaily', ttl: 86400000, limit: 1000 },
    ]),
    PrismaModule,
    UsersModule,
    AuthModule,
    WalletModule,
    MailModule,
    KycModule,
    AdminModule,
    RatesModule,
    PaymentsModule,
    StrowalletModule,
    AgentsModule,
    CommissionsModule,
    HealthModule,
    SubscriptionModule,
    MerchantModule,
    BusinessModule,
    ApiModule,
    GiftCardsModule,
    ReloadlyAuthModule,
    AirtimeModule,
    TrackingModule,
    TeamModule,
    TronModule,
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
