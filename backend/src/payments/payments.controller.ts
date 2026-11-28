import {
  Controller,
  Get,
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
import { BazikService, verifyBazikWebhookSignature } from './bazik.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReviewAccountBlockGuard } from '../common/review-account/review-account-block.guard';
import { MonCashTopupDto, MonCashConnectInitiateDto } from './dto/moncash-topup.dto';
import { BazikInitiateDto } from './dto/bazik-topup.dto';

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly monCashConnectService: MonCashConnectService,
    private readonly bazikService: BazikService,
  ) {}

  @Post('moncash/topup')
  @UseGuards(JwtAuthGuard, ReviewAccountBlockGuard)
  async createTopup(
    @Body() body: MonCashTopupDto,
    @Req() req,
  ) {
    const paymentUrl =
      await this.paymentsService.createMonCashPayment(
        body.amount,
        req.user?.id,
        body.agentId,
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
  @UseGuards(JwtAuthGuard, ReviewAccountBlockGuard)
  async initiateMoncashConnect(
    @Req() req: any,
    @Body() body: MonCashConnectInitiateDto,
  ) {
    const userId = req.user.id || req.user.sub;
    return this.monCashConnectService.createPaymentRequest(userId, Number(body.amount));
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

  // ======================================================
  // BAZIK.IO — MonCash deposits (staging feat/bazik-deposits — see
  // docs/bazik-api.md). Gated by MONCASH_GATEWAY; "moncashconnect" is the
  // prod default and leaves everything above this comment untouched.
  // ======================================================

  // Public, no secrets — lets the frontend decide which initiate route to
  // call without needing a build-time env var of its own.
  @Get('gateway')
  getGateway() {
    return { moncash: process.env.MONCASH_GATEWAY === 'bazik' ? 'bazik' : 'moncashconnect' };
  }

  @Post('bazik/initiate')
  @UseGuards(JwtAuthGuard, ReviewAccountBlockGuard)
  async initiateBazik(
    @Req() req: any,
    @Body() body: BazikInitiateDto,
  ) {
    const userId = req.user.id || req.user.sub;
    return this.bazikService.createPaymentRequest(userId, Number(body.amount));
  }

  @Post('bazik/webhook')
  @SkipThrottle()
  async bazikWebhook(
    @RawBody() rawBody: Buffer,
    @Headers('x-bazik-signature') signature?: string,
    @Headers('x-bazik-timestamp') timestamp?: string,
    @Headers('x-bazik-event-id') eventId?: string,
  ) {
    this.logger.log(`Bazik webhook hit — eventId=${eventId} ts=${timestamp}`);

    if (!rawBody) {
      this.logger.error('Bazik webhook: rawBody is undefined');
      throw new BadRequestException('Corps brut manke — pa ka verifye signature webhook');
    }

    const secret = process.env.BAZIK_WEBHOOK_SECRET;
    const valid = verifyBazikWebhookSignature(rawBody, signature, timestamp, eventId, secret);
    if (!valid) {
      this.logger.warn('Bazik webhook: signature invalide oswa manke — rejte');
      throw new UnauthorizedException('Signature webhook envalid');
    }

    let body: any;
    try {
      body = JSON.parse(rawBody.toString('utf8'));
    } catch {
      throw new BadRequestException('Corps JSON envalid');
    }

    const orderId: string | undefined = body.orderId;
    this.logger.log(`Bazik webhook verified: type=${body.type} orderId=${orderId}`);

    // Acknowledge 200 immediately (Bazik expects it within 5s) — the handler
    // always re-verifies via GET /order/{orderId} before crediting, never on
    // webhook payload alone. Fire-and-forget; the 5-min cron recovers any
    // processing failures.
    if (orderId) {
      this.bazikService.handleWebhookEvent(orderId).catch((err: any) =>
        this.logger.error(`Bazik webhook background error: ${err?.message}`, err?.stack),
      );
    }

    return { received: true };
  }
}