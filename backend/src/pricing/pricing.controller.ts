import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';

// Piblik (paj /pricing marketing web la bezwen l san login) — isFounderFreeCard
// sèlman kalkile si yon itilizatè konekte voye yon token valid.
@Controller('pricing')
@UseGuards(OptionalJwtAuthGuard)
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get()
  getPricing(@Request() req: any) {
    return this.pricingService.getPricing(req.user?.id);
  }
}
