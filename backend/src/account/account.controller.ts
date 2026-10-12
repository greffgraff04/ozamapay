import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AccountDeletionService } from './account-deletion.service';
import { RequestAccountDeletionDto } from './dto/account-deletion.dto';

// Plan endpoints-app, lo L4. Toujou auth requis — pa gen chemen piblik.
@Controller('account')
@UseGuards(JwtAuthGuard)
export class AccountController {
  constructor(private readonly accountDeletionService: AccountDeletionService) {}

  @Post('deletion-request')
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  requestDeletion(@Req() req: any, @Body() dto: RequestAccountDeletionDto) {
    const userId = req.user.id || req.user.sub;
    return this.accountDeletionService.requestDeletion(userId, dto);
  }

  @Post('deletion-cancel')
  @HttpCode(HttpStatus.OK)
  cancelDeletion(@Req() req: any) {
    const userId = req.user.id || req.user.sub;
    return this.accountDeletionService.cancelDeletion(userId);
  }

  @Get('deletion-status')
  getStatus(@Req() req: any) {
    const userId = req.user.id || req.user.sub;
    return this.accountDeletionService.getStatus(userId);
  }
}
