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
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { constructEvent, MonCashError } from '@moncashconnect/sdk';
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
    @Headers('x-mcc-signature') signature?: string,
    @Headers('x-mcc-timestamp') timestamp?: string,
  ) {
    this.logger.log(`MCConnect webhook hit — sig=${signature?.substring(0, 20)}... ts=${timestamp}`);

    if (!rawBody) {
      this.logger.error('MCConnect webhook: rawBody is undefined');
      throw new BadRequestException('Corps brut manke — pa ka verifye signature webhook');
    }

    let event: any;
    try {
      event = constructEvent(
        rawBody,
        signature ?? '',
        timestamp ?? '',
        process.env.MONCASHCONNECT_WEBHOOK_SECRET ?? '',
      );
    } catch (err: any) {
      if (err instanceof MonCashError) {
        this.logger.warn(`MCConnect webhook verification failed [${err.statusCode}]: ${err.message}`);
        throw new HttpException(err.message, err.statusCode || HttpStatus.BAD_REQUEST);
      }
      throw err;
    }

    this.logger.log(`MCConnect webhook verified: event=${event.event} ref=${event.reference} amount=${event.amount}`);

    // Acknowledge 200 immediately — MonCashConnect retries on non-2xx after 60s.
    // Fire-and-forget; the 15-min cron recovers any processing failures.
    if (event.event === 'payment.completed') {
      this.monCashConnectService.processWebhookPayment(event).catch((err: any) =>
        this.logger.error(`MCConnect webhook background error: ${err?.message}`, err?.stack),
      );
    } else if (event.event === 'payment.failed') {
      this.logger.warn(`MCConnect webhook: payment.failed for ref=${event.reference}`);
    } else {
      this.logger.log(`MCConnect webhook: unhandled event type "${event.event}" — ignoring`);
    }

    return { received: true };
  }
}