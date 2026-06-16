import { Controller, Get, Post, Param, Body, Req, UseGuards, Query } from '@nestjs/common';
import { GiftCardsService } from './giftcards.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('giftcards')
@UseGuards(JwtAuthGuard)
export class GiftCardsController {
  constructor(private readonly giftCardsService: GiftCardsService) {}

  @Get('products')
  async getProducts(@Query('countryCode') countryCode?: string) {
    return this.giftCardsService.getProducts(countryCode ?? 'US');
  }

  @Get('products/:id')
  async getProductById(@Param('id') id: string) {
    return this.giftCardsService.getProductById(Number(id));
  }

  @Post('order')
  async orderGiftCard(
    @Req() req: any,
    @Body('productId') productId: number,
    @Body('unitPrice') unitPrice: number,
  ) {
    const userId = req.user.id ?? req.user.sub;
    return this.giftCardsService.orderGiftCard(userId, Number(productId), Number(unitPrice));
  }

  @Get('orders')
  async getUserOrders(@Req() req: any) {
    const userId = req.user.id ?? req.user.sub;
    return this.giftCardsService.getUserOrders(userId);
  }
}
