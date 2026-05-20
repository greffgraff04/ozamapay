import { Module } from '@nestjs/common';
import { StrowalletService } from './strowallet.service';
import { StrowalletController } from './strowallet.controller'; // <-- Enpòte nouvo controller a
import { StrowalletWebhookController } from './strowallet.webhook.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [
    StrowalletWebhookController, 
    StrowalletController // <-- Deklare l isit la tou
  ],
  providers: [StrowalletService, PrismaService],
  exports: [StrowalletService],
})
export class StrowalletModule {}