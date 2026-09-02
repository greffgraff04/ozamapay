import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BSICardsService } from './bsicards.service';
import { BSICardsController } from './bsicards.controller';
import { BSICardsMastercardService } from './bsicards-mastercard.service';
import { BSICardsMastercardController } from './bsicards-mastercard.controller';
import { BSICardsMastercardEuroService } from './bsicards-mastercard-euro.service';
import { BSICardsWebhookController } from './bsicards.webhook.controller';
import { BSICardsBalanceSyncService } from './bsicards-balance-sync.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [ConfigModule.forRoot(), MailModule],
  controllers: [BSICardsController, BSICardsMastercardController, BSICardsWebhookController],
  providers: [BSICardsService, BSICardsMastercardService, BSICardsMastercardEuroService, BSICardsBalanceSyncService, PrismaService],
  exports: [BSICardsService, BSICardsMastercardService, BSICardsMastercardEuroService],
})
export class BSICardsModule {}
