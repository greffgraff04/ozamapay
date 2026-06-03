import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StrowalletService } from './strowallet.service';
import { StrowalletController } from './strowallet.controller';
import { StrowalletWebhookController } from './strowallet.webhook.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [
    StrowalletWebhookController,
    StrowalletController,
  ],
  providers: [StrowalletService, PrismaService],
  exports: [StrowalletService],
})
export class StrowalletModule {}