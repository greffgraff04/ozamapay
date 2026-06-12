import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class AgentAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const role = context.switchToHttp().getRequest().user?.role;
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN' && role !== 'AGENT') {
      throw new ForbiddenException('Aksè refize — Admin oswa Ajan sèlman');
    }
    return true;
  }
}
