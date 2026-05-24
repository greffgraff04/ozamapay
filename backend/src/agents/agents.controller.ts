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
  // APPLY AS AGENT
  // =========================

  @UseGuards(JwtAuthGuard)
  @Post('apply')
  async applyAsAgent(
    @Req() req,
    @Body()
    body: {
      businessName?: string;
    },
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
  async getMyDashboard(
    @Req() req,
  ) {
    return this.agentsService.getMyAgentDashboard(
      req.user.id,
    );
  }

  // =========================
  // MY COMMISSIONS
  // =========================

  @UseGuards(JwtAuthGuard)
  @Get('commissions')
  async getMyCommissions(
    @Req() req,
  ) {
    return this.agentsService.getMyCommissions(
      req.user.id,
    );
  }

  // =========================
  // WITHDRAW COMMISSION
  // =========================

  @UseGuards(JwtAuthGuard)
  @Post('withdraw')
  async withdrawCommission(
    @Req() req,
    @Body('amount')
    amount: number,
  ) {
    return this.agentsService.withdrawCommission(
      req.user.id,
      amount,
    );
  }

  // =========================
  // AGENT TOPUP USER
  // =========================

  @UseGuards(JwtAuthGuard)
  @Post('topup')
  async topupUser(
    @Req() req,
    @Body()
    dto: AgentTopupDto,
  ) {
    return this.agentsService.topupUser(
      req.user.id,
      dto,
    );
  }

  // =========================
  // AGENT WITHDRAW USER
  // =========================

  @UseGuards(JwtAuthGuard)
  @Post('withdraw-user')
  async withdrawUser(
    @Req() req,
    @Body()
    dto: AgentWithdrawDto,
  ) {
    return this.agentsService.withdrawForUser(
      req.user.id,
      dto,
    );
  }
}