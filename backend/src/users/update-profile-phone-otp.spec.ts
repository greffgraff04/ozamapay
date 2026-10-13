import { UserService } from './users.service';

// Lo L6 — PATCH /user/profile : chanjman telefòn pa app mobil (X-Device-Id
// prezan) mande OTP ; webapp (pa gen header a) kenbe ansyen konpòtman an
// dirèkteman, pou pa kraze l tout tan li poko adapte pou flux OTP a.
function buildService(userOverrides: Partial<any> = {}) {
  const user = { id: 'user-1', name: 'Client', phone: '50911111111', email: 'client@example.com', ...userOverrides };
  const prisma = {
    user: {
      findUnique: jest.fn(async () => ({ phone: user.phone })),
      update: jest.fn(async ({ data }: any) => {
        Object.assign(user, data);
        return { id: user.id, name: user.name, phone: user.phone, email: user.email };
      }),
    },
  };
  const otpService = {
    initiatePhoneChange: jest.fn(async () => ({ challengeToken: 'challenge-token-xyz' })),
  };
  const service = new UserService(prisma as any, otpService as any);
  return { service, prisma, otpService, user };
}

describe('UserService.updateProfile — gating OTP par X-Device-Id (lo L6)', () => {
  it('app mobil (isMobileDevice=true) + téléphone changé → 202 attendu, PAS de mise à jour en base', async () => {
    const { service, prisma, otpService, user } = buildService();

    const result = await service.updateProfile(user.id, { phone: '50922222222' }, true);

    expect(result).toEqual({ requiresOtp: true, challengeToken: 'challenge-token-xyz' });
    expect(otpService.initiatePhoneChange).toHaveBeenCalledWith(user.id, '50922222222');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('app mobil + nom ET téléphone changés → le nom est appliqué immédiatement, le téléphone attend l\'OTP', async () => {
    const { service, prisma, otpService, user } = buildService();

    const result = await service.updateProfile(user.id, { name: 'Nouveau Nom', phone: '50922222222' }, true);

    expect(result).toEqual({ requiresOtp: true, challengeToken: 'challenge-token-xyz' });
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: user.id }, data: { name: 'Nouveau Nom' } });
    expect(otpService.initiatePhoneChange).toHaveBeenCalledWith(user.id, '50922222222');
  });

  it('app mobil + téléphone identique à l\'actuel → pas d\'OTP, comportement normal', async () => {
    const { service, prisma, otpService, user } = buildService({ phone: '50911111111' });

    const result = await service.updateProfile(user.id, { phone: '50911111111' }, true);

    expect(otpService.initiatePhoneChange).not.toHaveBeenCalled();
    expect(result).toMatchObject({ success: true, phone: '50911111111' });
  });

  it('webapp (isMobileDevice=false) + téléphone changé → ancien comportement, mise à jour directe, pas d\'OTP', async () => {
    const { service, prisma, otpService, user } = buildService();

    const result = await service.updateProfile(user.id, { phone: '50922222222' }, false);

    expect(otpService.initiatePhoneChange).not.toHaveBeenCalled();
    expect(result).toMatchObject({ success: true, phone: '50922222222' });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ phone: '50922222222' }) }),
    );
  });

  it('webapp par défaut (3e argument omis) → même ancien comportement', async () => {
    const { service, otpService, user } = buildService();

    const result = await service.updateProfile(user.id, { phone: '50922222222' });

    expect(otpService.initiatePhoneChange).not.toHaveBeenCalled();
    expect(result).toMatchObject({ success: true, phone: '50922222222' });
  });
});

describe('UserService.updateProfile — PHONE_CHANGE_OTP_ALL_CLIENTS (lo L6b)', () => {
  const ENV_KEY = 'PHONE_CHANGE_OTP_ALL_CLIENTS';
  const originalValue = process.env[ENV_KEY];

  afterEach(() => {
    if (originalValue === undefined) delete process.env[ENV_KEY];
    else process.env[ENV_KEY] = originalValue;
  });

  it('flag absent (défaut) → webapp garde l\'ancien comportement, pas d\'OTP', async () => {
    delete process.env[ENV_KEY];
    const { service, otpService, user } = buildService();

    const result = await service.updateProfile(user.id, { phone: '50922222222' }, false);

    expect(otpService.initiatePhoneChange).not.toHaveBeenCalled();
    expect(result).toMatchObject({ success: true, phone: '50922222222' });
  });

  it('flag="true" → webapp (isMobileDevice=false) exige aussi l\'OTP', async () => {
    process.env[ENV_KEY] = 'true';
    const { service, prisma, otpService, user } = buildService();

    const result = await service.updateProfile(user.id, { phone: '50922222222' }, false);

    expect(result).toEqual({ requiresOtp: true, challengeToken: 'challenge-token-xyz' });
    expect(otpService.initiatePhoneChange).toHaveBeenCalledWith(user.id, '50922222222');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('flag="true" + téléphone inchangé → toujours pas d\'OTP', async () => {
    process.env[ENV_KEY] = 'true';
    const { service, otpService, user } = buildService({ phone: '50911111111' });

    const result = await service.updateProfile(user.id, { phone: '50911111111' }, false);

    expect(otpService.initiatePhoneChange).not.toHaveBeenCalled();
    expect(result).toMatchObject({ success: true, phone: '50911111111' });
  });

  it('valeur autre que "true" (ex: "1", "")  → traité comme désactivé', async () => {
    process.env[ENV_KEY] = '1';
    const { service, otpService, user } = buildService();

    const result = await service.updateProfile(user.id, { phone: '50922222222' }, false);

    expect(otpService.initiatePhoneChange).not.toHaveBeenCalled();
    expect(result).toMatchObject({ success: true, phone: '50922222222' });
  });
});
