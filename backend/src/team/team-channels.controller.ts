import { Controller, Get, Post, Delete, Param, Body, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TeamAuthGuard } from './guards/team-auth.guard';
import { TeamMemberGuard } from './guards/team-member.guard';
import { TeamRolesGuard } from './guards/team-roles.guard';
import { TeamRoles } from './decorators/team-roles.decorator';
import { TeamChannelsService, CreateChannelDto, PostMessageDto } from './team-channels.service';

@UseGuards(JwtAuthGuard, TeamAuthGuard, TeamMemberGuard)
@Controller('team')
export class TeamChannelsController {
  constructor(private readonly teamChannelsService: TeamChannelsService) {}

  @Get('channels')
  listChannels(@Request() req) {
    const isPrivileged = req.teamMember.role === 'SUPER_ADMIN' || req.teamMember.role === 'COO';
    return this.teamChannelsService.listChannels(req.teamMember.id, isPrivileged);
  }

  @Post('channels')
  @UseGuards(TeamRolesGuard)
  @TeamRoles('SUPER_ADMIN', 'COO')
  createChannel(@Body() dto: CreateChannelDto, @Request() req) {
    return this.teamChannelsService.createChannel(dto, req.teamMember.id);
  }

  @Delete('channels/:id')
  @UseGuards(TeamRolesGuard)
  @TeamRoles('SUPER_ADMIN', 'COO')
  deleteChannel(@Param('id') id: string) {
    return this.teamChannelsService.deleteChannel(id);
  }

  @Get('channels/:id/messages')
  listMessages(
    @Param('id') id: string,
    @Query('limit') limit: string,
    @Query('before') before: string,
    @Request() req,
  ) {
    return this.teamChannelsService.listMessages(
      id,
      req.teamMember.id,
      limit ? parseInt(limit, 10) : 50,
      before,
    );
  }

  @Post('channels/:id/messages')
  postMessage(@Param('id') id: string, @Body() dto: PostMessageDto, @Request() req) {
    return this.teamChannelsService.postMessage(id, req.teamMember.id, dto);
  }

  @Delete('messages/:id')
  deleteMessage(@Param('id') id: string, @Request() req) {
    return this.teamChannelsService.deleteMessage(id, req.teamMember.id, req.teamMember.role);
  }
}
