import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('moncash/topup')
  async createTopup(@Body('amount') amount: number, @Req() req) {
    // Isit la nou mande MonCash yon link peman
    const paymentUrl = await this.paymentsService.createMonCashPayment(amount, req.user?.id);
    
    // Nou chanje "url" pou li vin "redirectUrl" pou l ka match ak Frontend lan
    return { redirectUrl: paymentUrl };
  }

  // PWOBLEM NAN TE LA: Metòd sa a dwe anndan class la anvan dènye akolad la
  @Post('moncash/webhook')
  async handleMonCashWebhook(@Body() data: any) {
    // MonCash voye transactionId la nan body a
    const transactionId = data.transactionId;
    
    if (transactionId) {
      console.log(`📩 Webhook resevwa: Transaction ${transactionId}`);
      return await this.paymentsService.validateMonCashPayment(transactionId);
    }
    
    return { status: 'no_transaction_id' };
  }
} // <--- Akolad sa a dwe dènye bagay nan fichye a