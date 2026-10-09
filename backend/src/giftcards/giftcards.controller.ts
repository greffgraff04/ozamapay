import {
  Controller, Get, Post, Param, Body, Req, UseGuards, Query,
  Headers, RawBody, HttpCode, BadRequestException, ServiceUnavailableException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { GiftCardsService } from './giftcards.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { KycApprovedGuard } from '../kyc/kyc-approved.guard';

// 8 oct 2026 — kredansyal Reloadly envalid (INVALID_CREDENTIALS sou /oauth/token),
// katalòg ak kòmand kraze nèt. Kouvri-sekirite tanporè: GIFTCARDS_ENABLED=false
// nan env var bloke katalòg/kòmand ak yon mesaj klè olye yon erè 500 brit —
// chanje valè a sou Render epi sèvis la rebòte san bezwen nouvo deplwaman.
// `getUserOrders` PA afekte — kliyan dwe ka wè kòd kòmand COMPLETED yo toujou.
const GIFTCARDS_UNAVAILABLE_MESSAGE = 'Sèvis gift card tanporèman endisponib, n ap retabli l byento.';

function assertGiftCardsEnabled(): void {
  if (process.env.GIFTCARDS_ENABLED === 'false') {
    throw new ServiceUnavailableException(GIFTCARDS_UNAVAILABLE_MESSAGE);
  }
}

@Controller('giftcards')
export class GiftCardsController {
  constructor(private readonly giftCardsService: GiftCardsService) {}

  @Get('products')
  @UseGuards(JwtAuthGuard)
  async getProducts(@Query('countryCode') countryCode?: string) {
    assertGiftCardsEnabled();
    return this.giftCardsService.getProducts(countryCode ?? 'US');
  }

  @Get('products/:id')
  @UseGuards(JwtAuthGuard)
  async getProductById(@Param('id') id: string) {
    assertGiftCardsEnabled();
    return this.giftCardsService.getProductById(Number(id));
  }

  @Post('order')
  @UseGuards(JwtAuthGuard, KycApprovedGuard)
  async orderGiftCard(
    @Req() req: any,
    @Body('productId') productId: number,
    @Body('unitPrice') unitPrice: number,
    @Body('quantity') quantity?: number,
  ) {
    assertGiftCardsEnabled();
    const userId = req.user.id ?? req.user.sub;
    return this.giftCardsService.orderGiftCard(
      userId,
      Number(productId),
      Number(unitPrice),
      quantity === undefined ? 1 : Number(quantity),
    );
  }

  @Get('orders')
  @UseGuards(JwtAuthGuard)
  async getUserOrders(@Req() req: any) {
    const userId = req.user.id ?? req.user.sub;
    return this.giftCardsService.getUserOrders(userId);
  }

  @Post('webhook')
  @SkipThrottle()
  @HttpCode(200)
  async reloadlyWebhook(
    @RawBody() rawBody: Buffer,
    @Body() body: any,
    @Headers('x-reloadly-signature') signature?: string,
    @Headers('x-reloadly-request-timestamp') timestamp?: string,
  ) {
    if (
      !signature ||
      !timestamp ||
      !this.giftCardsService.verifyWebhookSignature(rawBody.toString(), signature, timestamp)
    ) {
      throw new BadRequestException('Invalid webhook signature');
    }
    await this.giftCardsService.processWebhook(body);
    return { received: true };
  }
}
