import { Module } from '@nestjs/common';
import { CommissionsService } from './commissions.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [CommissionsService, PrismaService],
  exports: [CommissionsService],
})
export class CommissionsModule {}