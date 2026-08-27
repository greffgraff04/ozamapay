import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { KycService } from './kyc.service';

@Injectable()
export class KycApprovedGuard implements CanActivate {
  constructor(private readonly kycService: KycService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId = req.user?.id ?? req.user?.sub;
    await this.kycService.assertApproved(userId);
    return true;
  }
}
