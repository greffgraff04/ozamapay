import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BSICardsService } from './bsicards.service';
import { BSICardsController } from './bsicards.controller';
import { BSICardsMastercardService } from './bsicards-mastercard.service';
import { BSICardsMastercardController } from './bsicards-mastercard.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [BSICardsController, BSICardsMastercardController],
  providers: [BSICardsService, BSICardsMastercardService, PrismaService],
  exports: [BSICardsService, BSICardsMastercardService],
})
export class BSICardsModule {}
