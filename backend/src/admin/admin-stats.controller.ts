import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CooGuard } from './coo.guard';
import { AgentStaffGuard } from './agent-staff.guard';
import { SupportGuard } from './support.guard';

@Controller('admin/stats')
@UseGuards(JwtAuthGuard)
export class AdminStatsController {
  constructor(private readonly adminService: AdminService) {}

  @Get('coo')
  @UseGuards(CooGuard)
  getCooStats() {
    return this.adminService.getCooStats();
  }

  @Get('agent')
  @UseGuards(AgentStaffGuard)
  getAgentStats() {
    return this.adminService.getAgentStats();
  }

  @Get('support')
  @UseGuards(SupportGuard)
  getSupportStats() {
    return this.adminService.getSupportStats();
  }
}
