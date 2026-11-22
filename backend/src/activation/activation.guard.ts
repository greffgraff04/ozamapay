import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ActivationService } from './activation.service';

@Injectable()
export class ActivationGuard implements CanActivate {
  constructor(private readonly activationService: ActivationService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId = req.user?.id ?? req.user?.sub;
    await this.activationService.assertActivated(userId);
    return true;
  }
}
