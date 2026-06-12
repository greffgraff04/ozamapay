import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class MasterGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const masterId = process.env.OZAMAPAY_MASTER_ID;
    const userId = req.user?.id ?? req.user?.sub;
    if (!masterId || userId !== masterId) {
      throw new ForbiddenException('Aksè refize — CEO sèlman');
    }
    return true;
  }
}
