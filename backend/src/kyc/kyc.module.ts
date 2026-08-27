import { Module } from '@nestjs/common';

import { KycController } from './kyc.controller';

import { KycService } from './kyc.service';

import { KycApprovedGuard } from './kyc-approved.guard';

import { PrismaModule } from '../prisma/prisma.module';

import { AuthModule } from '../auth/auth.module';

import { CommissionsModule } from '../commissions/commissions.module';

import { ImageKitModule } from '../imagekit/imagekit.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    CommissionsModule,
    ImageKitModule,
  ],

  controllers: [KycController],

  providers: [KycService, KycApprovedGuard],

  exports: [KycService, KycApprovedGuard],
})
export class KycModule {}