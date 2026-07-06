import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Request, UseGuards } from '@nestjs/common';
import { TeamTaskPriority, TeamTaskStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TeamAuthGuard } from './guards/team-auth.guard';
import { TeamMemberGuard } from './guards/team-member.guard';
import { TeamRolesGuard } from './guards/team-roles.guard';
import { TeamRoles } from './decorators/team-roles.decorator';
import {
  TeamTasksService,
  CreateTaskDto,
  UpdateTaskDto,
  UpdateTaskStatusDto,
  CreateTaskCommentDto,
} from './team-tasks.service';

@UseGuards(JwtAuthGuard, TeamAuthGuard, TeamMemberGuard)
@Controller('team/tasks')
export class TeamTasksController {
  constructor(private readonly teamTasksService: TeamTasksService) {}

  @Get()
  listTasks(
    @Query('assignedTo') assignedTo?: string,
    @Query('status') status?: TeamTaskStatus,
    @Query('priority') priority?: TeamTaskPriority,
    @Query('projectTag') projectTag?: string,
  ) {
    return this.teamTasksService.listTasks({ assignedTo, status, priority, projectTag });
  }

  @Post()
  @UseGuards(TeamRolesGuard)
  @TeamRoles('SUPER_ADMIN', 'COO', 'AGENT_MANAGER')
  createTask(@Body() dto: CreateTaskDto, @Request() req) {
    return this.teamTasksService.createTask(dto, req.teamMember.id);
  }

  @Patch(':id')
  @UseGuards(TeamRolesGuard)
  @TeamRoles('SUPER_ADMIN', 'COO', 'AGENT_MANAGER')
  updateTask(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.teamTasksService.updateTask(id, dto);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateTaskStatusDto, @Request() req) {
    return this.teamTasksService.updateStatus(id, dto.status, req.teamMember.id, req.teamMember.role);
  }

  @Delete(':id')
  @UseGuards(TeamRolesGuard)
  @TeamRoles('SUPER_ADMIN', 'COO')
  deleteTask(@Param('id') id: string) {
    return this.teamTasksService.deleteTask(id);
  }

  @Get(':id/comments')
  listComments(@Param('id') id: string) {
    return this.teamTasksService.listComments(id);
  }

  @Post(':id/comments')
  addComment(@Param('id') id: string, @Body() dto: CreateTaskCommentDto, @Request() req) {
    return this.teamTasksService.addComment(id, req.teamMember.id, dto);
  }
}
