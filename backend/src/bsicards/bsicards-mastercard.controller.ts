import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { BSICardsMastercardService } from './bsicards-mastercard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MasterGuard } from '../admin/master.guard';

// Admin/CEO-only, menm pè guard ak BSICardsController — "Digital USD
// Mastercard" (corpexpenses-mastercard-usd), pa gen endpoint customer-facing
// toutotan entegrasyon an poko pwouve.
@Controller('admin/bsicards/mastercard-usd')
@UseGuards(JwtAuthGuard, MasterGuard)
export class BSICardsMastercardController {
  constructor(private readonly bsicardsMastercardService: BSICardsMastercardService) {}

  @Post('create-card')
  createCard(@Body() body: { userId: string }) {
    return this.bsicardsMastercardService.createCard(body.userId);
  }
}
