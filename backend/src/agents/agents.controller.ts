import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AgentsService } from './agents.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  AgentTopupDto,
  AgentWithdrawDto,
} from './dto/agent-transactions.dto';

@Controller('agents')
export class AgentsController {
  constructor(
    private readonly agentsService: AgentsService,
  ) {}

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
    @Body() body: { amount: number; method: 'MONCASH' | 'ZELLE' | 'CASH' | 'BANK'; accountInfo: string },
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
  @UseGuards(JwtAuthGuard)
  @Post('apply')
  async applyAsAgent(
    @Req() req: any,
    @Body() body: { businessName?: string },
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
    @Body('amount') amount: number,
  ) {
    return this.agentsService.withdrawCommission(
      req.user.id,
      amount,
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