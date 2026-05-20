// src/wallet/wallet.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';

import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private walletService: WalletService) {}

  // ======================================================
  // GET BALANCE
  // ======================================================
  @Get('balance')
  async getBalance(@Request() req: any) {
    return this.walletService.getWallet(req.user.id);
  }

  // ======================================================
  // GET TRANSACTIONS
  // ======================================================
  @Get('transactions')
  async getTransactions(@Request() req: any) {
    return this.walletService.getTransactions(req.user.id);
  }

  // ======================================================
  // P2P TRANSFER (SAN FRAIS ET SÉCURISÉ)
  // ======================================================
  @Post('transfer-p2p')
  async transferP2P(
    @Request() req: any,
    @Body() body: { recipientEmail: string; amount: number },
  ) {
    const senderUserId = req.user.id;
    return this.walletService.transferP2P(
      senderUserId,
      body.recipientEmail,
      body.amount,
    );
  }

  // ======================================================
  // TRANSFER (AVÈK FRAIS)
  // ======================================================
  @Post('transfer')
  async transfer(
    @Request() req: any,
    @Body()
    body: {
      recipientEmail: string;
      amount: number;
    },
  ) {
    return this.walletService.transfer(
      req.user.id,
      body.recipientEmail,
      body.amount,
    );
  }

  // ======================================================
  // STATS
  // ======================================================
  @Get('stats')
  async getStats() {
    return this.walletService.getStats();
  }
}