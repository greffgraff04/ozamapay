import { Controller, Post, Body } from '@nestjs/common';
import { MerchantService, ApplyDto } from './merchant.service';

@Controller('merchant')
export class MerchantController {
  constructor(private merchantService: MerchantService) {}

  @Post('apply')
  apply(@Body() dto: ApplyDto) {
    return this.merchantService.apply(dto);
  }
}
