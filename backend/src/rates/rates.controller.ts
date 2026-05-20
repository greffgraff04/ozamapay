import { Controller, Get, Post, Body } from '@nestjs/common';
import { RatesService } from './rates.service';

@Controller('rates')
export class RatesController {
  constructor(private readonly ratesService: RatesService) {}

  @Get()
  findAll() {
    return this.ratesService.getAllRates();
  }

  @Post('update')
  update(@Body() data: { key: string; value: number }) {
    return this.ratesService.updateRate(data.key, data.value);
  }
}