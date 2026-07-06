import { Controller, Get, Post, Patch, Param, Body, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TeamAuthGuard } from './guards/team-auth.guard';
import { TeamMemberGuard } from './guards/team-member.guard';
import { TeamRolesGuard } from './guards/team-roles.guard';
import { TeamRoles } from './decorators/team-roles.decorator';
import {
  TeamReportsService,
  CreateReportDto,
  UpdateReportDto,
  ReviewReportDto,
} from './team-reports.service';

@UseGuards(JwtAuthGuard, TeamAuthGuard, TeamMemberGuard)
@Controller('team/reports')
export class TeamReportsController {
  constructor(private readonly teamReportsService: TeamReportsService) {}

  @Get()
  listReports(@Request() req) {
    return this.teamReportsService.listReports(req.teamMember.id, req.teamMember.role);
  }

  @Post()
  createReport(@Body() dto: CreateReportDto, @Request() req) {
    return this.teamReportsService.createReport(dto, req.teamMember.id);
  }

  @Patch(':id')
  updateReport(@Param('id') id: string, @Body() dto: UpdateReportDto, @Request() req) {
    return this.teamReportsService.updateReport(id, dto, req.teamMember.id);
  }

  @Patch(':id/review')
  @UseGuards(TeamRolesGuard)
  @TeamRoles('SUPER_ADMIN', 'COO')
  reviewReport(@Param('id') id: string, @Body() dto: ReviewReportDto) {
    return this.teamReportsService.reviewReport(id, dto);
  }
}
