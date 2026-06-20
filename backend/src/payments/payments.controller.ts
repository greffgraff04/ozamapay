import {
  Controller,
  Post,
  Body,
  RawBody,
  Req,
  Headers,
  UseGuards,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { SkipThrottle } from '@nestjs/throttler';

import { PaymentsService } from './payments.service';
import { MonCashConnectService } from './moncashconnect.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly monCashConnectService: MonCashConnectService,
  ) {}

  @Post('moncash/topup')
  @UseGuards(JwtAuthGuard)
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
  @SkipThrottle()
  async handleMonCashWebhook(
    @Body() data: any,
    @Headers('x-moncash-signature') signature?: string,
  ) {
    const secret = process.env.MONCASH_WEBHOOK_SECRET;
    if (!secret) {
      throw new UnauthorizedException('Webhook secret non konfigire');
    }
    if (!signature) {
      throw new UnauthorizedException('Signature webhook manke');
    }
    const expected = createHmac('sha256', secret).update(JSON.stringify(data)).digest('hex');
    let valid = false;
    try { valid = timingSafeEqual(Buffer.from(expected), Buffer.from(signature)); } catch {}
    if (!valid) {
      throw new UnauthorizedException('Signature webhook envalid');
    }

    const transactionId = data.transactionId;

    if (transactionId) {
      return await this.paymentsService.validateMonCashPayment(transactionId);
    }

    return { status: 'no_transaction_id' };
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
  @SkipThrottle()
  async moncashConnectWebhook(
    @RawBody() rawBody: Buffer,
    @Body() body: any,
    @Headers('x-mcc-signature') signature?: string,
    @Headers('x-mcc-timestamp') _timestamp?: string,
  ) {
    this.logger.log(`MCConnect webhook hit — sig=${signature?.substring(0, 20)}... body=${JSON.stringify(body)}`);

    if (!signature || !this.monCashConnectService.verifyWebhook(rawBody.toString(), signature)) {
      throw new BadRequestException('Signature webhook envalid');
    }
    await this.monCashConnectService.processWebhookPayment(body);
    return { received: true };
  }
}