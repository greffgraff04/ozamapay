import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AgentAccessGuard } from './agent-access.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, AgentAccessGuard)
export class AgentAdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('liquidity-requests')
  async getLiquidityRequests() {
    return this.adminService.getLiquidityRequests();
  }

  @Patch('liquidity-requests/:id/approve')
  async approveLiquidityRequest(
    @Param('id') id: string,
    @Body() body: { adminNote?: string },
  ) {
    return this.adminService.approveLiquidityRequest(id, body.adminNote);
  }

  @Patch('liquidity-requests/:id/reject')
  async rejectLiquidityRequest(
    @Param('id') id: string,
    @Body() body: { adminNote?: string },
  ) {
    return this.adminService.rejectLiquidityRequest(id, body.adminNote);
  }
}
