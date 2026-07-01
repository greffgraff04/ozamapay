import { Controller, Get, Patch, Post, Param, Body, Req, UseGuards, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { TrackingService } from '../tracking/tracking.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from './admin.guard';
import { MasterGuard } from './master.guard';
import { CooGuard } from './coo.guard';
import { AgentAccessGuard } from './agent-access.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly trackingService: TrackingService,
  ) {}

  @Get('live-activity')
  async getLiveActivity() {
    return this.trackingService.getLiveActivity();
  }

  @Get('dashboard-stats')
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('users')
  async getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Get('agents')
  @UseGuards(CooGuard)
  async getAllAgents() {
    return this.adminService.getAllAgents();
  }

  @Patch('kyc/:id/review')
  @UseGuards(CooGuard)
  async reviewKyc(
    @Param('id') kycId: string,
    @Body() body: { status: 'APPROVED' | 'REJECTED'; adminId?: string },
    @Req() req: any
  ) {
    const adminId = req.user?.id || body.adminId || "ADMIN-SYS";
    const ip = ((req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()) || req.ip;
    const result = await this.adminService.reviewKyc(kycId, body.status, adminId);
    await this.adminService.logActivity(adminId, `KYC_${body.status}`, `KYC ${kycId} — ${body.status}`, ip);
    return result;
  }

  @Post('users/:userId/topup')
  @UseGuards(CooGuard)
  async adminTopup(
    @Param('userId') userId: string,
    @Body() body: { amount: number },
    @Req() req: any
  ) {
    const adminId = req.user?.id || req.user?.sub;
    const ip = ((req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()) || req.ip;
    const result = await this.adminService.adminTopup(userId, body.amount);
    await this.adminService.logActivity(adminId, 'ADMIN_TOPUP', `Topup ${body.amount} HTG → user ${userId}`, ip);
    return result;
  }

  @Post('agents/:agentId/topup')
  @UseGuards(CooGuard)
  async adminTopupAgent(
    @Param('agentId') agentId: string,
    @Body() body: { amount: number }
  ) {
    return this.adminService.adminTopupAgent(agentId, body.amount);
  }

  @Patch('users/:userId/suspend')
  @UseGuards(CooGuard)
  async suspendUser(
    @Param('userId') userId: string,
    @Body() body: { isSuspended: boolean }
  ) {
    return this.adminService.suspendUser(userId, body.isSuspended);
  }

  @Get('finance-requests')
  @UseGuards(CooGuard)
  async getFinanceRequests() {
    return this.adminService.getFinanceRequests();
  }

  @Patch('finance-requests/:id/process')
  @UseGuards(CooGuard)
  @HttpCode(HttpStatus.OK)
  async processFinanceRequest(
    @Param('id') id: string,
    @Body() body: { status: 'COMPLETED' | 'REJECTED'; adminNote?: string },
  ) {
    return this.adminService.processFinanceRequest(id, body.status, body.adminNote);
  }

  @Get('transactions/pending')
  @UseGuards(CooGuard)
  async getPendingRequests() {
    return this.adminService.getPendingRequests();
  }

  @Post('send-kyc-reminder')
  @UseGuards(JwtAuthGuard, MasterGuard)
  @HttpCode(HttpStatus.OK)
  async sendKycReminder() {
    return this.adminService.sendKycReminder();
  }

  @Patch('transactions/:id/process')
  @UseGuards(CooGuard)
  async processManualTransaction(
    @Param('id') txId: string,
    @Body() body: { status: 'COMPLETED' | 'REJECTED'; adminId?: string },
    @Req() req: any
  ) {
    const adminId = req.user?.id || body.adminId || "ADMIN-SYS";
    const ip = ((req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()) || req.ip;
    const result = await this.adminService.processManualTransaction(txId, body.status, adminId);
    await this.adminService.logActivity(adminId, `TX_${body.status}`, `Transaction ${txId} — ${body.status}`, ip);
    return result;
  }

  // ── CEO-ONLY: INVITATION & DAILY CODE ─────────────────────────────────────

  @Post('invite')
  @UseGuards(JwtAuthGuard, MasterGuard)
  @HttpCode(HttpStatus.CREATED)
  async inviteEmployee(
    @Body() body: { email: string; role: string },
    @Req() req: any,
  ) {
    return this.adminService.inviteEmployee(body.email, body.role, req.user.id);
  }

  @Get('invitations')
  @UseGuards(JwtAuthGuard, MasterGuard)
  async getInvitations() {
    return this.adminService.getInvitations();
  }

  @Get('daily-code')
  @UseGuards(JwtAuthGuard, MasterGuard)
  async getDailyCode() {
    return this.adminService.getCurrentDailyCode();
  }

  @Post('generate-code')
  @UseGuards(JwtAuthGuard, MasterGuard)
  @HttpCode(HttpStatus.OK)
  async generateCode() {
    return this.adminService.generateDailyCode();
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard, MasterGuard)
  async getSessions() {
    return this.adminService.getSessions();
  }

  @Get('activity-logs')
  @UseGuards(JwtAuthGuard, MasterGuard)
  async getActivityLogs() {
    return this.adminService.getActivityLogs();
  }

  @Post('send-promo-mondiale')
  @UseGuards(JwtAuthGuard, MasterGuard)
  @HttpCode(HttpStatus.OK)
  async sendPromoMondiale() {
    return this.adminService.sendPromoEmail();
  }

  // ── BUSINESS ADMIN ────────────────────────────────────────────────────────

  @Get('business-applications')
  @UseGuards(CooGuard)
  async getBusinessApplications(@Query('status') status?: string) {
    return this.adminService.getBusinessApplications(status);
  }

  @Patch('business-applications/:businessId/approve')
  @UseGuards(CooGuard)
  async approveBusinessApplication(
    @Param('businessId') businessId: string,
    @Req() req: any,
  ) {
    const adminId = req.user?.id;
    const ip = ((req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()) || req.ip;
    const result = await this.adminService.approveBusinessApplication(businessId);
    await this.adminService.logActivity(adminId, 'BUSINESS_APPROVED', `Business ${businessId} apwouve`, ip);
    return result;
  }

  @Patch('business-applications/:businessId/reject')
  @UseGuards(CooGuard)
  async rejectBusinessApplication(
    @Param('businessId') businessId: string,
    @Body() body: { reason?: string },
    @Req() req: any,
  ) {
    const adminId = req.user?.id;
    const ip = ((req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()) || req.ip;
    const result = await this.adminService.rejectBusinessApplication(businessId, body.reason);
    await this.adminService.logActivity(adminId, 'BUSINESS_REJECTED', `Business ${businessId} refize`, ip);
    return result;
  }

  @Get('businesses')
  @UseGuards(CooGuard)
  async getAllBusinesses() {
    return this.adminService.getAllBusinesses();
  }
}