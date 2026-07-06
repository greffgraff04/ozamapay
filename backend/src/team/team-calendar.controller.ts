import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TeamAuthGuard } from './guards/team-auth.guard';
import { TeamMemberGuard } from './guards/team-member.guard';
import { TeamCalendarService, CreateCalendarEventDto, UpdateCalendarEventDto } from './team-calendar.service';

@UseGuards(JwtAuthGuard, TeamAuthGuard, TeamMemberGuard)
@Controller('team')
export class TeamCalendarController {
  constructor(private readonly teamCalendarService: TeamCalendarService) {}

  @Get('calendar')
  listEvents(@Query('month') month?: string, @Query('year') year?: string) {
    return this.teamCalendarService.listEvents(
      month ? parseInt(month, 10) : undefined,
      year ? parseInt(year, 10) : undefined,
    );
  }

  @Post('calendar')
  createEvent(@Body() dto: CreateCalendarEventDto, @Request() req) {
    return this.teamCalendarService.createEvent(dto, req.teamMember.id);
  }

  @Patch('calendar/:id')
  updateEvent(@Param('id') id: string, @Body() dto: UpdateCalendarEventDto, @Request() req) {
    return this.teamCalendarService.updateEvent(id, dto, req.teamMember.id, req.teamMember.role);
  }

  @Delete('calendar/:id')
  deleteEvent(@Param('id') id: string, @Request() req) {
    return this.teamCalendarService.deleteEvent(id, req.teamMember.id, req.teamMember.role);
  }

  @Get('calendar/:id/join')
  joinFromCalendar(@Param('id') id: string, @Request() req) {
    return this.teamCalendarService.joinEvent(id, req.teamMember.id);
  }

  @Get('meetings/:eventId/join')
  async joinMeeting(@Param('eventId') eventId: string, @Request() req) {
    const { meetingUrl, roomId } = await this.teamCalendarService.joinEvent(eventId, req.teamMember.id);
    return {
      meetingUrl,
      roomId,
      displayName: req.teamMember.displayName,
      avatarUrl: req.teamMember.avatar,
    };
  }
}
