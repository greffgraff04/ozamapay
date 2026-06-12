import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class AgentStaffGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const role = context.switchToHttp().getRequest().user?.role;
    if (role !== 'AGENT' && role !== 'ADMIN') {
      throw new ForbiddenException('Aksè refize — Ajan sèlman');
    }
    return true;
  }
}
