import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { BSICardsService } from './bsicards.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MasterGuard } from '../admin/master.guard';

// Admin/CEO-only pou kounye a (menm pè guard ak SweepController) — pa gen
// endpoint customer-facing (/v1/cards) toutotan entegrasyon an poko pwouve.
@Controller('admin/bsicards')
@UseGuards(JwtAuthGuard, MasterGuard)
export class BSICardsController {
  constructor(private readonly bsicardsService: BSICardsService) {}

  @Post('create-card')
  createCard(@Body() body: { userId: string }) {
    return this.bsicardsService.createCard(body.userId);
  }

  @Get('card/:userId')
  getCard(@Param('userId') userId: string) {
    return this.bsicardsService.getCard(userId);
  }

  @Get('all-cards')
  getAllCards(@Query('email') email: string) {
    return this.bsicardsService.getAllCards(email);
  }

  @Post('block')
  blockCard(@Body() body: { userId: string }) {
    return this.bsicardsService.blockCard(body.userId);
  }

  @Post('unblock')
  unblockCard(@Body() body: { userId: string }) {
    return this.bsicardsService.unblockCard(body.userId);
  }
}
