import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TeamRole } from '@prisma/client';
import { TEAM_ROLES_KEY } from '../decorators/team-roles.decorator';

// Must run after TeamAuthGuard. Enforces @TeamRoles(...) metadata.
// Bootstrap exception: if the caller has no TeamMember yet but the
// route accepts SUPER_ADMIN, an existing platform ADMIN/SUPER_ADMIN
// (User.role) may still pass — this is how the very first Team Hub
// SUPER_ADMIN gets created via the invite endpoint.
@Injectable()
export class TeamRolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<TeamRole[]>(TEAM_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const teamMember = req.teamMember;
    const platformRole = req.user?.role;

    if (teamMember && required.includes(teamMember.role)) {
      return true;
    }

    if (!teamMember && required.includes('SUPER_ADMIN' as TeamRole) &&
        (platformRole === 'ADMIN' || platformRole === 'SUPER_ADMIN')) {
      return true;
    }

    throw new ForbiddenException('Aksè refize — wòl ou pa otorize pou aksyon sa.');
  }
}
