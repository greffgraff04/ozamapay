import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StrowalletService } from './strowallet.service';
import { StrowalletController } from './strowallet.controller';
import { StrowalletHealthController } from './strowallet.health.controller';
import { StrowalletWebhookController } from './strowallet.webhook.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [
    StrowalletWebhookController,
    StrowalletHealthController,
    StrowalletController,
  ],
  providers: [StrowalletService, PrismaService],
  exports: [StrowalletService],
})
export class StrowalletModule {}