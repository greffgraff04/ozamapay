import { Controller, Post, Get, Body, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { StrowalletService } from './strowallet.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // <-- Asire w chemen sa a kòrèk paraprò } fòldè w la

@Controller('v1/cards')
@UseGuards(JwtAuthGuard) // <-- Nou dekòmante l pou sekirite a ka aktif!
export class StrowalletController {
  constructor(private readonly strowalletService: StrowalletService) {}

  /**
   * GET /v1/cards/my-card
   */
  @Get('my-card')
  async getMyCard(@Req() req: any) {
    // Kounye a req.user.id ap prezan paske Guard la ap travay
    return await this.strowalletService.getMyCardLocalData(req.user.id);
  }

  /**
   * POST /v1/cards/create
   */
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async createCard(@Req() req: any, @Body('amountUsd') amountUsd: number) {
    return await this.strowalletService.createAndFundCard(req.user.id, amountUsd);
  }

  /**
   * POST /v1/cards/recharge
   */
  @Post('recharge')
  @HttpCode(HttpStatus.OK)
  async rechargeCard(@Req() req: any, @Body('amountUsd') amountUsd: number) {
    return await this.strowalletService.fundVirtualCard(req.user.id, amountUsd);
  }

  @Post('secret-details')
  async getSecretDetails(@Req() req: any) {
    return await this.strowalletService.getCardSecretDetails(req.user.id);
  }

  @Post('history')
  async getHistory(@Req() req: any) {
    return await this.strowalletService.getCardHistory(req.user.id);
  }
}