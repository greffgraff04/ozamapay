import { Controller, Get, Patch, Post, Param, Body, Req, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';

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

  @Patch('users/:userId/suspend')
  async suspendUser(
    @Param('userId') userId: string,
    @Body() body: { isSuspended: boolean }
  ) {
    return this.adminService.suspendUser(userId, body.isSuspended);
  }
}