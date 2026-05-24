import { Module } from '@nestjs/common';

import { KycController } from './kyc.controller';

import { KycService } from './kyc.service';

import { PrismaModule } from '../prisma/prisma.module';

import { AuthModule } from '../auth/auth.module';

import { CommissionsModule } from '../commissions/commissions.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    CommissionsModule,
  ],

  controllers: [KycController],

  providers: [KycService],
})
export class KycModule {}