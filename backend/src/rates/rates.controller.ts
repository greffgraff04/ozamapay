import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { RatesService } from './rates.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../admin/admin.guard';

@Controller('rates')
export class RatesController {
  constructor(private readonly ratesService: RatesService) {}

  @Get()
  findAll() {
    return this.ratesService.getAllRates();
  }

  @Post('update')
  @UseGuards(JwtAuthGuard, AdminGuard)
  update(@Body() data: { key: string; value: number }) {
    return this.ratesService.updateRate(data.key, data.value);
  }
}
