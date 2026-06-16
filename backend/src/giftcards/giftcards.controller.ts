import {
  Controller, Get, Post, Param, Body, Req, UseGuards, Query,
  Headers, RawBody, HttpCode, BadRequestException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { GiftCardsService } from './giftcards.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('giftcards')
export class GiftCardsController {
  constructor(private readonly giftCardsService: GiftCardsService) {}

  @Get('products')
  @UseGuards(JwtAuthGuard)
  async getProducts(@Query('countryCode') countryCode?: string) {
    return this.giftCardsService.getProducts(countryCode ?? 'US');
  }

  @Get('products/:id')
  @UseGuards(JwtAuthGuard)
  async getProductById(@Param('id') id: string) {
    return this.giftCardsService.getProductById(Number(id));
  }

  @Post('order')
  @UseGuards(JwtAuthGuard)
  async orderGiftCard(
    @Req() req: any,
    @Body('productId') productId: number,
    @Body('unitPrice') unitPrice: number,
  ) {
    const userId = req.user.id ?? req.user.sub;
    return this.giftCardsService.orderGiftCard(userId, Number(productId), Number(unitPrice));
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
