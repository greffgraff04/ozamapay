import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class SupportGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const role = context.switchToHttp().getRequest().user?.role;
    if (role !== 'SUPPORT' && role !== 'ADMIN') {
      throw new ForbiddenException('Aksè refize — Support sèlman');
    }
    return true;
  }
}
