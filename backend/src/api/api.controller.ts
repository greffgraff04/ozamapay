import { Controller, Get, Post, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiKeyGuard } from './api-key.guard';
import { ApiKeyThrottlerGuard } from './api-key-throttler.guard';
import { ApiService, InitiatePaymentDto, CreateWebhookDto } from './api.service';

@Controller('api/v1')
@UseGuards(ApiKeyGuard, ApiKeyThrottlerGuard)
@Throttle({ short: { limit: 100, ttl: 60000 }, apiDaily: { limit: 1000, ttl: 86400000 } })
export class ApiController {
  constructor(private readonly apiService: ApiService) {}

  @Post('payments/initiate')
  initiatePayment(@Req() req: any, @Body() dto: InitiatePaymentDto) {
    return this.apiService.initiatePayment(req.business, req.apiKey, dto);
  }

  @Get('payments/:paymentId')
  getPayment(@Req() req: any, @Param('paymentId') paymentId: string) {
    return this.apiService.getPayment(req.business, req.apiKey, paymentId);
  }

  @Get('transactions')
  getTransactions(
    @Req() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.apiService.getTransactions(req.business, req.apiKey, { limit, offset, status, from, to });
  }

  @Get('balance')
  getBalance(@Req() req: any) {
    return this.apiService.getBalance(req.business, req.apiKey);
  }

  @Post('webhooks')
  createWebhook(@Req() req: any, @Body() dto: CreateWebhookDto) {
    return this.apiService.createWebhook(req.business, req.apiKey, dto);
  }

  @Get('webhooks')
  listWebhooks(@Req() req: any) {
    return this.apiService.listWebhooks(req.business, req.apiKey);
  }

  @Delete('webhooks/:id')
  removeWebhook(@Req() req: any, @Param('id') id: string) {
    return this.apiService.removeWebhook(req.business, req.apiKey, id);
  }
}
