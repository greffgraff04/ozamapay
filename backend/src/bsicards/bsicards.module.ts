import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BSICardsService } from './bsicards.service';
import { BSICardsController } from './bsicards.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [BSICardsController],
  providers: [BSICardsService, PrismaService],
  exports: [BSICardsService],
})
export class BSICardsModule {}
