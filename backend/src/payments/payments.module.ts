import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { MonCashConnectService } from './moncashconnect.service';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [MailModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, MonCashConnectService],
  exports: [PaymentsService, MonCashConnectService],
})
export class PaymentsModule {}