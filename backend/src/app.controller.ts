import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

@SkipThrottle()
@Controller()
export class AppController {

  @Get()
  getHello(): string {
    return 'OZAMAPAY API';
  }

  @Get('health')
  getHealth() {
    return { status: 'ok', timestamp: new Date() };
  }
}