import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AgentsService } from './agents.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { KycApprovedGuard } from '../kyc/kyc-approved.guard';
import {
  AgentTopupDto,
  AgentWithdrawDto,
  WithdrawCommissionDto,
} from './dto/agent-transactions.dto';
import { LiquidityRequestDto, ApplyAgentDto } from './dto/liquidity-request.dto';

@Controller('agents')
export class AgentsController {
  constructor(
    private readonly agentsService: AgentsService,
  ) {}

  // =========================
  // PUBLIC: VERIFY AGENT (no auth)
  // =========================
  @Get('verify/:agentCode')
  async verifyAgent(@Param('agentCode') agentCode: string) {
    const agent = await this.agentsService.verifyAgent(agentCode.toUpperCase());
    if (!agent) {
      return { verified: false };
    }
    return {
      verified: true,
      name: agent.user.name,
      agentCode: agent.agentCode,
      level: agent.level,
      status: agent.status,
    };
  }

  // =========================
  // MY LIQUIDITY REQUESTS
  // =========================
  @UseGuards(JwtAuthGuard)
  @Get('liquidity-requests')
  async getMyLiquidityRequests(@Req() req: any) {
    return this.agentsService.getMyLiquidityRequests(req.user.id);
  }

  // =========================
  // LIQUIDITY REQUEST
  // =========================
  @UseGuards(JwtAuthGuard)
  @Post('liquidity-request')
  async createLiquidityRequest(
    @Req() req: any,
    @Body() body: LiquidityRequestDto,
  ) {
    return this.agentsService.createLiquidityRequest(
      req.user.id,
      body.amount,
      body.method,
      body.accountInfo,
    );
  }

  // =========================
  // APPLY AS AGENT
  // =========================
  // KYC APPROVED obligatwa anvan ou ka aplike kòm ajan — san sa a nenpòt
  // kont (menm KYC PENDING/REJECTED) te ka kreye yon Agent PENDING.
  @UseGuards(JwtAuthGuard, KycApprovedGuard)
  @Post('apply')
  async applyAsAgent(
    @Req() req: any,
    @Body() body: ApplyAgentDto,
  ) {
    return this.agentsService.applyAsAgent(
      req.user.id,
      body.businessName,
    );
  }

  // =========================
  // MY AGENT DASHBOARD
  // =========================
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMyDashboard(@Req() req: any) {
    return this.agentsService.getMyAgentDashboard(req.user.id);
  }

  // =========================
  // MY COMMISSIONS
  // =========================
  @UseGuards(JwtAuthGuard)
  @Get('commissions')
  async getMyCommissions(@Req() req: any) {
    return this.agentsService.getMyCommissions(req.user.id);
  }

  // =========================
  // WITHDRAW COMMISSION
  // =========================
  @UseGuards(JwtAuthGuard)
  @Post('withdraw')
  async withdrawCommission(
    @Req() req: any,
    @Body() body: WithdrawCommissionDto,
  ) {
    return this.agentsService.withdrawCommission(
      req.user.id,
      body.amount,
    );
  }

  // =========================
  // AGENT TOPUP USER (DEPO SOU KONT KLIYAN)
  // =========================
  @UseGuards(JwtAuthGuard)
  @Post('topup')
  async topupUser(
    @Req() req: any,
    @Body() dto: AgentTopupDto,
  ) {
    return this.agentsService.topupUser(
      req.user.id,
      dto,
    );
  }

  // =========================
  // AGENT WITHDRAW USER (RETRÈ KLIYAN LAKAY AJAN)
  // =========================
  @UseGuards(JwtAuthGuard)
  @Post('withdraw-user')
  async withdrawUser(
    @Req() req: any,
    @Body() dto: AgentWithdrawDto,
  ) {
    return this.agentsService.withdrawForUser(
      req.user.id,
      dto,
    );
  }
}