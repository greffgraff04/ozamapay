import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Runs after JwtAuthGuard. Attaches req.teamMember (null if the platform
// user has no Team Hub membership yet) — never blocks on null so that
// bootstrap flows (join, platform-admin self-invite) can proceed; only
// blocks a member who has been deactivated.
@Injectable()
export class TeamAuthGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId = req.user?.id;
    if (!userId) {
      throw new ForbiddenException('Ou dwe konekte pou aksede Team Hub.');
    }

    const teamMember = await this.prisma.teamMember.findUnique({
      where: { userId },
    });

    if (teamMember && !teamMember.isActive) {
      throw new ForbiddenException('Kont ekip ou dezaktive. Kontakte yon SUPER_ADMIN.');
    }

    req.teamMember = teamMember ?? null;
    return true;
  }
}
