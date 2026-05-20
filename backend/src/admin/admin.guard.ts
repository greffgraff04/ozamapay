import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Sa sipoze soti nan AuthMiddleware ou a

    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException('Ou pa gen dwa akses nan zòn sa a');
    }
    return true;
  }
}