import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { StrowalletService } from './strowallet.service';
import { CardOtpService } from './card-otp.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('v1/cards')
@UseGuards(JwtAuthGuard)
export class StrowalletController {
  constructor(
    private readonly strowalletService: StrowalletService,
    private readonly cardOtpService: CardOtpService,
  ) {}

  @Get('my-card')
  getMyCardLocalData(@Request() req) {
    return this.strowalletService.getMyCardLocalData(req.user.id);
  }

  // Kòd la restriksyon a sèl pwopriyetè kat la (JwtAuthGuard + rechèch pa
  // req.user.id) — retounen null si pa gen okenn kòd ki poko ekspire.
  @Get('otp')
  getCardOtp(@Request() req) {
    return this.cardOtpService.get(req.user.id);
  }

  @Post('create')
  createAndFundCard(@Request() req, @Body() body: { amount_usd: number }) {
    const amount = Number(body.amount_usd) || 5;
    return this.strowalletService.createAndFundCard(req.user.id, amount);
  }

  @Post('recharge')
  fundVirtualCard(@Request() req, @Body() body: { amount_usd: number }) {
    return this.strowalletService.fundVirtualCard(req.user.id, body.amount_usd);
  }

  @Post('secret-details')
  getCardSecretDetails(@Request() req) {
    return this.strowalletService.getCardSecretDetails(req.user.id);
  }

  @Get('history')
  getCardHistory(@Request() req) {
    return this.strowalletService.getCardHistory(req.user.id);
  }

  @Post('freeze')
  freezeCard(@Request() req) {
    return this.strowalletService.freezeCard(req.user.id);
  }

  @Post('unfreeze')
  unfreezeCard(@Request() req) {
    return this.strowalletService.unfreezeCard(req.user.id);
  }
}
