import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TronAddressService } from './tron-address.service';

@Controller('wallet/deposit-address')
@UseGuards(JwtAuthGuard)
export class TronController {
  constructor(private readonly tronAddressService: TronAddressService) {}

  @Get()
  async getDepositAddress(@Req() req: any) {
    const deposit = await this.tronAddressService.getOrCreateDepositAddress(req.user.id);
    return { address: deposit.address, network: deposit.network };
  }
}
