import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StrowalletService } from './strowallet.service';
import { StrowalletController } from './strowallet.controller';
import { StrowalletHealthController } from './strowallet.health.controller';
import { StrowalletWebhookController } from './strowallet.webhook.controller';
import { CardTerminationService } from './card-termination.service';
import { CardTransactionService } from './card-transaction.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [ConfigModule.forRoot(), MailModule],
  controllers: [
    StrowalletWebhookController,
    StrowalletHealthController,
    StrowalletController,
  ],
  providers: [StrowalletService, CardTerminationService, CardTransactionService, PrismaService],
  exports: [StrowalletService],
})
export class StrowalletModule {}