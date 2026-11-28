import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { MonCashConnectService } from './moncashconnect.service';
import { BazikService } from './bazik.service';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [MailModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, MonCashConnectService, BazikService],
  exports: [PaymentsService, MonCashConnectService, BazikService],
})
export class PaymentsModule {}