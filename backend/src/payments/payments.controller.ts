import {
  Controller,
  Post,
  Body,
  Req,
  Headers,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';

import { PaymentsService } from './payments.service';
import { MonCashConnectService } from './moncashconnect.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly monCashConnectService: MonCashConnectService,
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

  // ======================================================
  // MONCASHCONNECT — Automatic topup
  // ======================================================

  @Post('moncashconnect/initiate')
  @UseGuards(JwtAuthGuard)
  async initiateMoncashConnect(
    @Req() req: any,
    @Body('amount') amount: number,
  ) {
    const userId = req.user.id || req.user.sub;
    return this.monCashConnectService.createPaymentRequest(userId, Number(amount));
  }

  @Post('moncashconnect/webhook')
  async moncashConnectWebhook(
    @Body() body: any,
    @Headers('x-signature') signature?: string,
  ) {
    if (signature && !this.monCashConnectService.verifyWebhook(JSON.stringify(body), signature)) {
      throw new BadRequestException('Signature webhook envalid');
    }
    await this.monCashConnectService.processWebhookPayment(body);
    return { received: true };
  }
}