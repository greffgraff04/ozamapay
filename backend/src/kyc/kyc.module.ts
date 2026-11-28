import { Module } from '@nestjs/common';

import { KycController } from './kyc.controller';

import { SumsubController } from './sumsub.controller';

import { KycService } from './kyc.service';

import { SumsubService } from './sumsub.service';

import { KycApprovedGuard } from './kyc-approved.guard';

import { PrismaModule } from '../prisma/prisma.module';

import { AuthModule } from '../auth/auth.module';

import { CommissionsModule } from '../commissions/commissions.module';

import { ImageKitModule } from '../imagekit/imagekit.module';

import { StrowalletModule } from '../strowallet/strowallet.module';

import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    CommissionsModule,
    ImageKitModule,
    // Pour injecter MailService dans SumsubService (email d'approbation KYC,
    // même que le chemin admin). MailModule n'est pas @Global.
    MailModule,
    // 4 oct 2026 — applyCorrectedAddress() rele StrowalletService dirèkteman
    // pou relanse createAndFundCard()/createReplacementCard() otomatikman
    // apre yon adrès korije (wè CardCreationAddressBlock).
    StrowalletModule,
  ],

  controllers: [KycController, SumsubController],

  providers: [KycService, SumsubService, KycApprovedGuard],

  exports: [KycService, KycApprovedGuard],
})
export class KycModule {}