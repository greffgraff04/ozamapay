import { Module } from '@nestjs/common';
import { CardsService } from './cards.service';
import { StrowalletController } from '../strowallet/strowallet.controller';
import { StrowalletModule } from '../strowallet/strowallet.module';
import { BSICardsModule } from '../bsicards/bsicards.module';
import { PrismaService } from '../prisma/prisma.service';

// Pwen antre miltip-provider pou fonksyon kliyan yo (v1/cards/*).
// StrowalletController deplase isit (31 out 2026) — li rete non "Strowallet"
// pou kounye a pou evite yon gwo renmen fichye, men li pa StroWallet-sèlman
// ankò: li delege bay CardsService, ki gade card.provider epi rele bon
// sèvis la (StrowalletService oswa yon sèvis BSICards).
@Module({
  imports: [StrowalletModule, BSICardsModule],
  controllers: [StrowalletController],
  providers: [CardsService, PrismaService],
})
export class CardsModule {}
