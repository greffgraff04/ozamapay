import { Controller, Get, Post, Patch, Param, Body, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TeamAuthGuard } from './guards/team-auth.guard';
import { TeamMemberGuard } from './guards/team-member.guard';
import { TeamRolesGuard } from './guards/team-roles.guard';
import { TeamRoles } from './decorators/team-roles.decorator';
import {
  TeamMembersService,
  InviteTeamMemberDto,
  ChangeTeamMemberRoleDto,
  DeactivateTeamMemberDto,
} from './team-members.service';

@UseGuards(JwtAuthGuard, TeamAuthGuard)
@Controller('team')
export class TeamMembersController {
  constructor(private readonly teamMembersService: TeamMembersService) {}

  // POST /team/join/:token — onboarding, no existing TeamMember required
  @Post('join/:token')
  join(@Param('token') token: string, @Request() req) {
    return this.teamMembersService.acceptInvitation(token, req.user.id, req.user.email);
  }

  // GET /team/dashboard
  @Get('dashboard')
  @UseGuards(TeamMemberGuard)
  dashboard(@Request() req) {
    return this.teamMembersService.getDashboard(req.teamMember.id);
  }

  // GET /team/members
  @Get('members')
  @UseGuards(TeamMemberGuard)
  listMembers() {
    return this.teamMembersService.listMembers();
  }

  // GET /team/members/me
  @Get('members/me')
  @UseGuards(TeamMemberGuard)
  me(@Request() req) {
    return this.teamMembersService.getMe(req.user.id);
  }

  // POST /team/members/invite — SUPER_ADMIN/COO, bootstrap-allowed
  @Post('members/invite')
  @UseGuards(TeamRolesGuard)
  @TeamRoles('SUPER_ADMIN', 'COO')
  invite(@Body() dto: InviteTeamMemberDto, @Request() req) {
    return this.teamMembersService.invite(dto, req.user.id);
  }

  // PATCH /team/members/:id/role — SUPER_ADMIN only
  @Patch('members/:id/role')
  @UseGuards(TeamMemberGuard, TeamRolesGuard)
  @TeamRoles('SUPER_ADMIN')
  changeRole(@Param('id') id: string, @Body() dto: ChangeTeamMemberRoleDto) {
    return this.teamMembersService.changeRole(id, dto.role);
  }

  // PATCH /team/members/:id/deactivate — SUPER_ADMIN/COO
  @Patch('members/:id/deactivate')
  @UseGuards(TeamMemberGuard, TeamRolesGuard)
  @TeamRoles('SUPER_ADMIN', 'COO')
  deactivate(@Param('id') id: string, @Body() dto: DeactivateTeamMemberDto) {
    return this.teamMembersService.setActive(id, dto.isActive ?? false);
  }
}
