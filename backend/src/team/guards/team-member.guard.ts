import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

// Must run after TeamAuthGuard. Requires an active TeamMember row —
// use on any route that isn't a bootstrap/onboarding entry point.
@Injectable()
export class TeamMemberGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (!req.teamMember) {
      throw new ForbiddenException('Aksè rezève pou manm ekip OZAMAPAY sèlman.');
    }
    return true;
  }
}
