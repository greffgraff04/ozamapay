import { Module } from '@nestjs/common';

import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ImageKitModule } from '../imagekit/imagekit.module';

/*
|--------------------------------------------------------------------------
| FUTURE MODULES
|--------------------------------------------------------------------------
| Kreye modules sa yo pita pou architecture OZAMAPAY la scalable :
|
| - UploadModule
| - NotificationModule
| - SettingsModule
| - FinanceModule
| - AdminModule
|
| Pou kounya nou kite yo commenté pou backend la pa kraze.
|--------------------------------------------------------------------------
*/

// import { UploadModule } from '../upload/upload.module';
// import { NotificationModule } from '../notification/notification.module';
// import { SettingsModule } from '../settings/settings.module';
// import { FinanceModule } from '../finance/finance.module';
// import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ImageKitModule,

    /*
    |--------------------------------------------------------------------------
    | FUTURE IMPORTS
    |--------------------------------------------------------------------------
    */

    // UploadModule,
    // NotificationModule,
    // SettingsModule,
    // FinanceModule,
    // AdminModule,
  ],

  controllers: [
    WalletController,
  ],

  providers: [
    WalletService,
  ],

  exports: [
    WalletService,
  ],
})
export class WalletModule {}