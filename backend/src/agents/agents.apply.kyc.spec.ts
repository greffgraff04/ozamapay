import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AgentsController } from './agents.controller';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { KycApprovedGuard } from '../kyc/kyc-approved.guard';
import { KycService } from '../kyc/kyc.service';
import { ForbiddenException } from '@nestjs/common';

// Swit backend pou sekirite agents : POST /agents/apply dwe bloke si KYC
// itilizatè a pa APPROVED, menm si frontend pa voye verifikasyon an.
describe('POST /agents/apply — KYC gating', () => {
  it('route applyAsAgent gen KycApprovedGuard anplis JwtAuthGuard', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      AgentsController.prototype.applyAsAgent,
    );
    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(KycApprovedGuard);
  });

  it('KycApprovedGuard rejte yon itilizatè ki pa gen KYC APPROVED', async () => {
    const kycService = {
      assertApproved: jest.fn().mockRejectedValue(new ForbiddenException('KYC ou an PENDING')),
    } as unknown as KycService;
    const guard = new KycApprovedGuard(kycService);

    const ctx: any = {
      switchToHttp: () => ({ getRequest: () => ({ user: { id: 'user-not-kyc-1' } }) }),
    };

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    expect(kycService.assertApproved).toHaveBeenCalledWith('user-not-kyc-1');
  });

  it('KycApprovedGuard kite pase yon itilizatè KYC APPROVED', async () => {
    const kycService = {
      assertApproved: jest.fn().mockResolvedValue(undefined),
    } as unknown as KycService;
    const guard = new KycApprovedGuard(kycService);

    const ctx: any = {
      switchToHttp: () => ({ getRequest: () => ({ user: { id: 'user-kyc-approved-1' } }) }),
    };

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });
});
