import { Module } from '@nestjs/common';
import { AirtimeService } from './airtime.service';
import { AirtimeController } from './airtime.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [AirtimeController],
  providers: [AirtimeService, PrismaService],
})
export class AirtimeModule {}
