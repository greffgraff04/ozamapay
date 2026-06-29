import { Controller, Get, Param } from '@nestjs/common';
import { BusinessService } from './business.service';

@Controller('business')
export class BusinessPublicController {
  constructor(private readonly businessService: BusinessService) {}

  // GET /business/:id/public — no auth required
  @Get(':id/public')
  getPublicInfo(@Param('id') id: string) {
    return this.businessService.getPublicInfo(id);
  }
}
