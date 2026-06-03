import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('subscription')
@UseGuards(JwtAuthGuard)
export class SubscriptionController {
  constructor(private subscriptionService: SubscriptionService) {}

  @Get('status')
  getStatus(@Req() req: any) {
    return this.subscriptionService.getStatus(req.user.id);
  }

  @Post('upgrade')
  upgrade(@Req() req: any) {
    return this.subscriptionService.upgrade(req.user.id);
  }

  @Post('cancel')
  cancel(@Req() req: any) {
    return this.subscriptionService.cancel(req.user.id);
  }
}
