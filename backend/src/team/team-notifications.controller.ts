import { Controller, Get, Patch, Param, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TeamAuthGuard } from './guards/team-auth.guard';
import { TeamMemberGuard } from './guards/team-member.guard';
import { TeamNotificationsService } from './team-notifications.service';

@UseGuards(JwtAuthGuard, TeamAuthGuard, TeamMemberGuard)
@Controller('team/notifications')
export class TeamNotificationsController {
  constructor(private readonly teamNotificationsService: TeamNotificationsService) {}

  @Get()
  listNotifications(
    @Query('limit') limit: string,
    @Query('unreadOnly') unreadOnly: string,
    @Request() req,
  ) {
    return this.teamNotificationsService.listNotifications(
      req.teamMember.id,
      limit ? parseInt(limit, 10) : 20,
      unreadOnly === 'true',
    );
  }

  @Get('count')
  countUnread(@Request() req) {
    return this.teamNotificationsService.countUnread(req.teamMember.id);
  }

  @Patch('read-all')
  markAllRead(@Request() req) {
    return this.teamNotificationsService.markAllRead(req.teamMember.id);
  }

  @Patch(':id/read')
  markOneRead(@Param('id') id: string, @Request() req) {
    return this.teamNotificationsService.markOneRead(id, req.teamMember.id);
  }
}
