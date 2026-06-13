import { Controller, Get } from '@nestjs/common';
import { StrowalletService } from './strowallet.service';

@Controller('v1/cards')
export class StrowalletHealthController {
  constructor(private readonly strowalletService: StrowalletService) {}

  @Get('health')
  checkHealth() {
    return this.strowalletService.checkHealth();
  }
}
