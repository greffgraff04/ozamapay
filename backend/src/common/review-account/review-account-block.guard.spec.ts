import { ForbiddenException } from '@nestjs/common';
import { ReviewAccountBlockGuard } from './review-account-block.guard';

function buildGuard() {
  const prisma: any = { reviewAccountAuditLog: { create: jest.fn().mockResolvedValue({}) } };
  const guard = new ReviewAccountBlockGuard(prisma);
  return { guard, prisma };
}

function mockContext(req: any) {
  return { switchToHttp: () => ({ getRequest: () => req }) } as any;
}

describe('ReviewAccountBlockGuard', () => {
  const ENV_KEYS = ['APP_REVIEW_ACCOUNT_ENABLED', 'APP_REVIEW_ACCOUNT_EMAILS'];
  afterEach(() => {
    for (const key of ENV_KEYS) delete process.env[key];
  });

  it('kite pase si itilizatè a pa yon kont demo', async () => {
    process.env.APP_REVIEW_ACCOUNT_ENABLED = 'true';
    process.env.APP_REVIEW_ACCOUNT_EMAILS = 'reviewer@example.com,recipient@example.com';
    const { guard } = buildGuard();
    const req = { user: { email: 'random-user@example.com' } };
    await expect(guard.canActivate(mockContext(req))).resolves.toBe(true);
  });

  it('bloke ak 403 + mesaj egzat pou yon kont demo, menm si switch la "false" (pwoteksyon pèmanan)', async () => {
    process.env.APP_REVIEW_ACCOUNT_ENABLED = 'false';
    process.env.APP_REVIEW_ACCOUNT_EMAILS = 'reviewer@example.com,recipient@example.com';
    const { guard } = buildGuard();
    const req = { user: { id: 'u1', email: 'reviewer@example.com' }, method: 'POST', url: '/wallet/withdraw' };
    await expect(guard.canActivate(mockContext(req))).rejects.toThrow(
      'Fonksyon sa a pa disponib sou kont demonstrasyon an.',
    );
    await expect(guard.canActivate(mockContext(req))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('ekri yon log odit lè li bloke, san jwenn okenn kòd/sekrè', async () => {
    process.env.APP_REVIEW_ACCOUNT_ENABLED = 'true';
    process.env.APP_REVIEW_ACCOUNT_EMAILS = 'reviewer@example.com,recipient@example.com';
    const { guard, prisma } = buildGuard();
    const req = {
      user: { id: 'u1', email: 'reviewer@example.com' },
      method: 'POST',
      originalUrl: '/wallet/withdraw',
      ip: '1.2.3.4',
    };
    await expect(guard.canActivate(mockContext(req))).rejects.toThrow();
    expect(prisma.reviewAccountAuditLog.create).toHaveBeenCalledWith({
      data: {
        userId: 'u1',
        email: 'reviewer@example.com',
        method: 'POST',
        path: '/wallet/withdraw',
        ipAddress: '1.2.3.4',
      },
    });
  });

  it('pa gen req.user ditou (pa otantifye) — kite pase, JwtAuthGuard ki responsab sa', async () => {
    const { guard } = buildGuard();
    const req = {};
    await expect(guard.canActivate(mockContext(req))).resolves.toBe(true);
  });
});
