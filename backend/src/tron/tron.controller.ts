import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReviewAccountBlockGuard } from '../common/review-account/review-account-block.guard';
import { TronAddressService } from './tron-address.service';

@Controller('wallet/deposit-address')
@UseGuards(JwtAuthGuard)
export class TronController {
  constructor(private readonly tronAddressService: TronAddressService) {}

  // Générer une adresse de dépôt, c'est le préalable à un vrai dépôt
  // USDT — bloqué pour les comptes démo au même titre qu'un dépôt direct,
  // même si "lire" une adresse n'est pas en soi un mouvement d'argent.
  @Get()
  @UseGuards(ReviewAccountBlockGuard)
  async getDepositAddress(@Req() req: any) {
    const deposit = await this.tronAddressService.getOrCreateDepositAddress(req.user.id);
    return { address: deposit.address, network: deposit.network };
  }
}
