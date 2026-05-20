import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService], // Sa ap pèmèt lòt modil sèvi ak sèvis la si bezwen an parèt
})
export class PaymentsModule {}