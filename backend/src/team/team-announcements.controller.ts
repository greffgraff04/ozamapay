import { Controller, Get, Post, Delete, Param, Body, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TeamAuthGuard } from './guards/team-auth.guard';
import { TeamMemberGuard } from './guards/team-member.guard';
import { TeamRolesGuard } from './guards/team-roles.guard';
import { TeamRoles } from './decorators/team-roles.decorator';
import { TeamAnnouncementsService, CreateAnnouncementDto } from './team-announcements.service';

@UseGuards(JwtAuthGuard, TeamAuthGuard, TeamMemberGuard)
@Controller('team/announcements')
export class TeamAnnouncementsController {
  constructor(private readonly teamAnnouncementsService: TeamAnnouncementsService) {}

  @Get()
  listAnnouncements() {
    return this.teamAnnouncementsService.listAnnouncements();
  }

  @Post()
  @UseGuards(TeamRolesGuard)
  @TeamRoles('SUPER_ADMIN', 'COO')
  createAnnouncement(@Body() dto: CreateAnnouncementDto, @Request() req) {
    return this.teamAnnouncementsService.createAnnouncement(dto, req.teamMember.id);
  }

  @Delete(':id')
  @UseGuards(TeamRolesGuard)
  @TeamRoles('SUPER_ADMIN', 'COO')
  deleteAnnouncement(@Param('id') id: string) {
    return this.teamAnnouncementsService.deleteAnnouncement(id);
  }
}
