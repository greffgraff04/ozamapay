import { Controller, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MasterGuard } from '../admin/master.guard';
import { SweepService } from './sweep.service';

@Controller('admin/sweep')
@UseGuards(JwtAuthGuard, MasterGuard)
export class SweepController {
  constructor(private readonly sweepService: SweepService) {}

  @Post('run')
  @HttpCode(HttpStatus.OK)
  async run(@Query('dryRun') dryRun?: string) {
    return this.sweepService.runSweep(dryRun === 'true');
  }
}
