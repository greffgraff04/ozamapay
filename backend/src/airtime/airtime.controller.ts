import { Controller, Get, Post, Body, Req, UseGuards, Query } from '@nestjs/common';
import { AirtimeService } from './airtime.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('airtime')
@UseGuards(JwtAuthGuard)
export class AirtimeController {
  constructor(private readonly airtimeService: AirtimeService) {}

  @Get('operators')
  async getOperators(@Query('countryCode') countryCode?: string) {
    return this.airtimeService.getOperators(countryCode ?? 'HT');
  }

  @Post('topup')
  async sendAirtime(
    @Req() req: any,
    @Body('operatorId') operatorId: number,
    @Body('amount') amount: number,
    @Body('phoneNumber') phoneNumber: string,
  ) {
    const userId = req.user.id ?? req.user.sub;
    return this.airtimeService.sendAirtime(userId, Number(operatorId), Number(amount), phoneNumber);
  }

  @Get('orders')
  async getUserOrders(@Req() req: any) {
    const userId = req.user.id ?? req.user.sub;
    return this.airtimeService.getUserOrders(userId);
  }
}
