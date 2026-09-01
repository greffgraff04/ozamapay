import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { StrowalletService } from './strowallet.service';
import { CardOtpService } from './card-otp.service';
import { CardsService } from '../cards/cards.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// 31 out 2026 — my-card/secret-details/recharge/freeze/unfreeze delege bay
// CardsService (miltip-provider: StroWallet + BSICards). create/otp/history
// rete StroWallet-sèlman pou kounye a (pa gen ekivalan BSICards).
@Controller('v1/cards')
@UseGuards(JwtAuthGuard)
export class StrowalletController {
  constructor(
    private readonly strowalletService: StrowalletService,
    private readonly cardOtpService: CardOtpService,
    private readonly cardsService: CardsService,
  ) {}

  @Get('my-card')
  getMyCardLocalData(@Request() req) {
    return this.cardsService.getMyCard(req.user.id);
  }

  // Kòd la restriksyon a sèl pwopriyetè kat la (JwtAuthGuard + rechèch pa
  // req.user.id) — retounen null si pa gen okenn kòd ki poko ekspire.
  @Get('otp')
  getCardOtp(@Request() req) {
    return this.cardOtpService.get(req.user.id);
  }

  @Post('create')
  createAndFundCard(@Request() req, @Body() body: { amount_usd: number }) {
    return this.strowalletService.createAndFundCard(req.user.id, Number(body.amount_usd));
  }

  @Post('recharge')
  fundVirtualCard(@Request() req, @Body() body: { amount_usd: number }) {
    return this.cardsService.fundCard(req.user.id, Number(body.amount_usd));
  }

  @Post('secret-details')
  getCardSecretDetails(@Request() req) {
    return this.cardsService.getSecretDetails(req.user.id);
  }

  @Get('history')
  getCardHistory(@Request() req) {
    return this.strowalletService.getCardHistory(req.user.id);
  }

  @Post('freeze')
  freezeCard(@Request() req) {
    return this.cardsService.freezeCard(req.user.id);
  }

  @Post('unfreeze')
  unfreezeCard(@Request() req) {
    return this.cardsService.unfreezeCard(req.user.id);
  }
}
