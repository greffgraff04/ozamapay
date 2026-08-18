import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AirtimeService } from './airtime.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// Airtime purchasing (operators list + topup) has been retired. Order
// history stays readable so past purchasers can still see their receipts —
// see AirtimeService for details.
@Controller('airtime')
@UseGuards(JwtAuthGuard)
export class AirtimeController {
  constructor(private readonly airtimeService: AirtimeService) {}

  @Get('orders')
  async getUserOrders(@Req() req: any) {
    const userId = req.user.id ?? req.user.sub;
    return this.airtimeService.getUserOrders(userId);
  }
}
