import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StrowalletService } from './strowallet.service';
import { StrowalletHealthController } from './strowallet.health.controller';
import { StrowalletWebhookController } from './strowallet.webhook.controller';
import { CardTerminationService } from './card-termination.service';
import { CardTransactionService } from './card-transaction.service';
import { CardOtpService } from './card-otp.service';
import { ZiiropayCorrelationService } from './ziiropay-correlation.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailModule } from '../mail/mail.module';

// StrowalletController deplase nan CardsModule (31 out 2026) — li vin pwen
// antre miltip-provider (v1/cards/*), pa jis StroWallet. Modil sa a rete
// pwopriyetè StrowalletService + CardOtpService (ekspòte pou CardsModule).
@Module({
  imports: [ConfigModule.forRoot(), MailModule],
  controllers: [
    StrowalletWebhookController,
    StrowalletHealthController,
  ],
  providers: [StrowalletService, CardTerminationService, CardTransactionService, CardOtpService, ZiiropayCorrelationService, PrismaService],
  exports: [StrowalletService, CardOtpService],
})
export class StrowalletModule {}