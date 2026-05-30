import { Controller, Get, Patch, Post, Param, Body, Req, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard-stats')
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('users')
  async getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Get('agents')
  async getAllAgents() {
    return this.adminService.getAllAgents();
  }

  @Patch('kyc/:id/review')
  async reviewKyc(
    @Param('id') kycId: string,
    @Body() body: { status: 'APPROVED' | 'REJECTED'; adminId?: string },
    @Req() req: any
  ) {
    const adminId = req.user?.id || body.adminId || "ADMIN-SYS";
    return this.adminService.reviewKyc(kycId, body.status, adminId);
  }

  @Post('users/:userId/topup')
  async adminTopup(
    @Param('userId') userId: string,
    @Body() body: { amount: number }
  ) {
    return this.adminService.adminTopup(userId, body.amount);
  }

  @Post('agents/:agentId/topup')
  async adminTopupAgent(
    @Param('agentId') agentId: string,
    @Body() body: { amount: number }
  ) {
    return this.adminService.adminTopupAgent(agentId, body.amount);
  }

  @Patch('users/:userId/suspend')
  async suspendUser(
    @Param('userId') userId: string,
    @Body() body: { isSuspended: boolean }
  ) {
    return this.adminService.suspendUser(userId, body.isSuspended);
  }

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

  @Get('transactions/pending')
  async getPendingRequests() {
    return this.adminService.getPendingRequests();
  }

  @UseGuards(JwtAuthGuard)
  @Patch('transactions/:id/process')
  async processManualTransaction(
    @Param('id') txId: string,
    @Body() body: { status: 'COMPLETED' | 'REJECTED'; adminId?: string },
    @Req() req: any
  ) {
    const adminId = req.user?.id || body.adminId || "ADMIN-SYS";
    return this.adminService.processManualTransaction(txId, body.status, adminId);
  }
}