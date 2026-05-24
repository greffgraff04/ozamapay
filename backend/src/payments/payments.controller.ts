import {
  Controller,
  Post,
  Body,
  Req,
} from '@nestjs/common';

import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
  ) {}

  @Post('moncash/topup')
  async createTopup(
    @Body('amount') amount: number,
    @Body('agentId') agentId: string,
    @Req() req,
  ) {
    const paymentUrl =
      await this.paymentsService.createMonCashPayment(
        amount,
        req.user?.id,
        agentId,
      );

    return {
      redirectUrl: paymentUrl,
    };
  }

  @Post('moncash/webhook')
  async handleMonCashWebhook(
    @Body() data: any,
  ) {
    const transactionId =
      data.transactionId;

    if (transactionId) {
      console.log(
        `📩 Webhook reçu: ${transactionId}`,
      );

      return await this.paymentsService.validateMonCashPayment(
        transactionId,
      );
    }

    return {
      status:
        'no_transaction_id',
    };
  }
}