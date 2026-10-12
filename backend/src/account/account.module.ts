import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { AccountController } from './account.controller';
import { AccountDeletionAdminController } from './account-deletion-admin.controller';
import { AccountDeletionService } from './account-deletion.service';

@Module({
  imports: [AuthModule, MailModule],
  controllers: [AccountController, AccountDeletionAdminController],
  providers: [AccountDeletionService],
})
export class AccountModule {}
