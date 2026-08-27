import { Module } from '@nestjs/common';
import { GiftCardsService } from './giftcards.service';
import { GiftCardsController } from './giftcards.controller';
import { PrismaService } from '../prisma/prisma.service';
import { KycModule } from '../kyc/kyc.module';

@Module({
  imports: [KycModule],
  controllers: [GiftCardsController],
  providers: [GiftCardsService, PrismaService],
})
export class GiftCardsModule {}
// ReloadlyAuthService is provided globally via ReloadlyAuthModule in AppModule
