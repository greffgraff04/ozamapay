import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler'; // <-- Enpòte sa si w gen throttler

@Controller()
export class AppController {

  @Get('health')
  @SkipThrottle() // <-- Sa ap anpeche Render pran erè 429 la!
  health() {
    return {
      status: 'ok',
    };
  }
}