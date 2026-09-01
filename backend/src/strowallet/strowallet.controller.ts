import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
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

  // Lis TOUT kat ACTIVE/FROZEN kliyan an (kèlkeswa provider) — pou UI switcher.
  @Get('my-cards')
  getMyCards(@Request() req) {
    return this.cardsService.getMyCards(req.user.id);
  }

  // Kòd la restriksyon a sèl pwopriyetè kat la (JwtAuthGuard + rechèch pa
  // req.user.id) — retounen null si pa gen okenn kòd ki poko ekspire.
  @Get('otp')
  getCardOtp(@Request() req) {
    return this.cardOtpService.get(req.user.id);
  }

  // `provider` opsyonèl — defo STROWALLET_NFC pou konpatibilite ak aparèy
  // ki poko voye l (app mobil la).
  @Post('create')
  createCard(@Request() req, @Body() body: { amount_usd?: number; provider?: string }) {
    return this.cardsService.createCard(req.user.id, body.provider ?? 'STROWALLET_NFC', Number(body.amount_usd));
  }

  @Post('recharge')
  fundVirtualCard(@Request() req, @Body() body: { amount_usd: number; cardId?: string }) {
    return this.cardsService.fundCard(req.user.id, Number(body.amount_usd), body.cardId);
  }

  @Post('secret-details')
  getCardSecretDetails(@Request() req, @Body() body: { cardId?: string }) {
    return this.cardsService.getSecretDetails(req.user.id, body?.cardId);
  }

  @Get('history')
  getCardHistory(@Request() req, @Query('cardId') cardId?: string) {
    return this.strowalletService.getCardHistory(req.user.id, cardId);
  }

  @Post('freeze')
  freezeCard(@Request() req, @Body() body: { cardId?: string }) {
    return this.cardsService.freezeCard(req.user.id, body?.cardId);
  }

  @Post('unfreeze')
  unfreezeCard(@Request() req, @Body() body: { cardId?: string }) {
    return this.cardsService.unfreezeCard(req.user.id, body?.cardId);
  }
}
