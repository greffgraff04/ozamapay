import { Module } from '@nestjs/common';
import { GiftCardsService } from './giftcards.service';
import { GiftCardsController } from './giftcards.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [GiftCardsController],
  providers: [GiftCardsService, PrismaService],
})
export class GiftCardsModule {}
