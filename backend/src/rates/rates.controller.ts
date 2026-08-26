import { Controller, Get, Post, Body, Query, Req, UseGuards } from '@nestjs/common';
import { RatesService } from './rates.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CooGuard } from '../admin/coo.guard';

@Controller('rates')
export class RatesController {
  constructor(private readonly ratesService: RatesService) {}

  @Get()
  findAll() {
    return this.ratesService.getAllRates();
  }

  @Get('history')
  @UseGuards(JwtAuthGuard, CooGuard)
  getHistory(@Query('pair') pair?: string) {
    return this.ratesService.getRateHistory(pair);
  }

  @Post('update')
  @UseGuards(JwtAuthGuard, CooGuard)
  update(@Body() data: { key: string; value: number }, @Req() req: any) {
    const adminId = req.user.id || req.user.sub;
    return this.ratesService.updateRate(data.key, data.value, adminId);
  }
}
