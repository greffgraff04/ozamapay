import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BSICardsService } from './bsicards.service';
import { BSICardsController } from './bsicards.controller';
import { BSICardsMastercardService } from './bsicards-mastercard.service';
import { BSICardsMastercardController } from './bsicards-mastercard.controller';
import { BSICardsMastercardEuroService } from './bsicards-mastercard-euro.service';
import { BSICardsWebhookController } from './bsicards.webhook.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [BSICardsController, BSICardsMastercardController, BSICardsWebhookController],
  providers: [BSICardsService, BSICardsMastercardService, BSICardsMastercardEuroService, PrismaService],
  exports: [BSICardsService, BSICardsMastercardService, BSICardsMastercardEuroService],
})
export class BSICardsModule {}
