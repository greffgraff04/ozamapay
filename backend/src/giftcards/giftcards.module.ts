import { Module } from '@nestjs/common';
import { GiftCardsService } from './giftcards.service';
import { GiftCardsController } from './giftcards.controller';
import { PrismaService } from '../prisma/prisma.service';
import { KycModule } from '../kyc/kyc.module';
import { ActivationModule } from '../activation/activation.module';

@Module({
  imports: [KycModule, ActivationModule],
  controllers: [GiftCardsController],
  providers: [GiftCardsService, PrismaService],
})
export class GiftCardsModule {}
// ReloadlyAuthService is provided globally via ReloadlyAuthModule in AppModule
