import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';

// Même approche que auth.mobile-sessions.spec.ts (voir ce fichier) —
// instanciation directe de AuthService avec des fausses dépendances, pas
// de TestingModule NestJS.

const ORIGINAL_ENV = { ...process.env };

function buildFakePrisma() {
  const usersById = new Map<string, any>();
  const sessions: any[] = [];
  let counter = 0;

  function findByWhere(where: any) {
    const all = [...usersById.values()];
    if (where.appleUserId !== undefined) return all.find((u) => u.appleUserId === where.appleUserId) ?? null;
    if (where.googleId !== undefined) return all.find((u) => u.googleId === where.googleId) ?? null;
    if (where.email !== undefined) return all.find((u) => u.email === where.email) ?? null;
    if (where.id !== undefined) return usersById.get(where.id) ?? null;
    return null;
  }

  const userClient = {
    findUnique: jest.fn(async ({ where }: any) => findByWhere(where)),
    update: jest.fn(async ({ where, data }: any) => {
      const u = findByWhere(where);
      Object.assign(u, data);
      return u;
    }),
  };

  const sessionClient = {
    findFirst: jest.fn(async ({ where }: any) =>
      sessions.find((s) => s.userId === where.userId && s.deviceId === where.deviceId) ?? null,
    ),
    create: jest.fn(async ({ data }: any) => {
      const row = { id: `session-${++counter}`, ...data };
      sessions.push(row);
      return row;
    }),
  };

  return {
    usersById,
    sessions,
    seedUser(user: any) {
      usersById.set(user.id, user);
    },
    user: userClient,
    session: sessionClient,
    $transaction: jest.fn(async (cb: any) =>
      cb({
        user: {
          create: jest.fn(async ({ data }: any) => {
            const u = { id: `user-${++counter}`, ...data };
            usersById.set(u.id, u);
            return u;
          }),
        },
        wallet: {
          create: jest.fn(async ({ data }: any) => ({ id: `wallet-${++counter}`, ...data })),
        },
      }),
    ),
  };
}

function buildService(fakePrisma: any, overrides: { apple?: any; google?: any } = {}) {
  const jwtService = {
    sign: jest.fn(() => 'fake-jwt-token'),
    verify: jest.fn(),
  };
  const mailService = { sendWelcome: jest.fn() };
  const twoFactorService = {};
  const tokenBlacklist = { add: jest.fn(), has: jest.fn().mockResolvedValue(false) };
  const appleAuthService = {
    verifyIdentityToken: jest.fn(),
    exchangeAuthorizationCodeAndEncrypt: jest.fn().mockResolvedValue(null),
    ...overrides.apple,
  };
  const googleMobileAuthService = {
    verifyIdToken: jest.fn(),
    ...overrides.google,
  };
  const service = new AuthService(
    fakePrisma as any,
    jwtService as any,
    mailService as any,
    twoFactorService as any,
    tokenBlacklist as any,
    appleAuthService as any,
    googleMobileAuthService as any,
  );
  return { service, mailService, appleAuthService, googleMobileAuthService };
}

const DEVICE_INFO = { deviceId: 'device-1', deviceName: 'iPhone', platform: 'ios' };

describe('AuthService.loginWithApple', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.clearAllMocks();
  });

  it('nouvel utilisateur: kreye kont + wallet, emailVerified=true, pa gen aparèy konni → requiresDeviceVerification', async () => {
    const fakePrisma = buildFakePrisma();
    const { service, appleAuthService, mailService } = buildService(fakePrisma, {
      apple: {
        verifyIdentityToken: jest.fn().mockResolvedValue({
          sub: 'apple-sub-1',
          email: 'nouvo@example.com',
          emailVerified: true,
          isPrivateEmail: false,
        }),
      },
    });

    const result = await service.loginWithApple(
      { identityToken: 'tok', authorizationCode: 'code', fullName: { givenName: 'Jean', familyName: 'Pierre' } } as any,
      DEVICE_INFO,
    );

    expect(result).toMatchObject({ requiresDeviceVerification: true, isNewUser: true });
    expect((result as any).challengeToken).toBeDefined();

    const created = [...fakePrisma.usersById.values()][0];
    expect(created.email).toBe('nouvo@example.com');
    expect(created.appleUserId).toBe('apple-sub-1');
    expect(created.emailVerified).toBe(true);
    expect(created.password).toBe('');
    expect(mailService.sendWelcome).toHaveBeenCalledWith('nouvo@example.com', 'Jean Pierre');
  });

  it('liaison compte existant: email deja nan BDD, emailVerified Apple=true → lye appleUserId san kreye doub', async () => {
    const fakePrisma = buildFakePrisma();
    fakePrisma.seedUser({
      id: 'user-existing',
      email: 'existing@example.com',
      name: 'Existing User',
      role: 'USER',
      password: 'hashed',
      appleUserId: null,
      referredByAgentId: null,
      transactionPin: null,
      wallet: { balance: 100 },
      kyc: null,
    });
    const { service, appleAuthService } = buildService(fakePrisma, {
      apple: {
        verifyIdentityToken: jest.fn().mockResolvedValue({
          sub: 'apple-sub-2',
          email: 'existing@example.com',
          emailVerified: true,
          isPrivateEmail: false,
        }),
      },
    });

    const result = await service.loginWithApple({ identityToken: 'tok', authorizationCode: 'code' } as any, DEVICE_INFO);

    expect(result).toMatchObject({ requiresDeviceVerification: true, isNewUser: false });
    expect(fakePrisma.usersById.get('user-existing').appleUserId).toBe('apple-sub-2');
    expect(fakePrisma.usersById.size).toBe(1); // pa gen doub kont kreye
  });

  it('deja lye: jwenn dirèkteman pa appleUserId, pa re-kreye/re-lye', async () => {
    const fakePrisma = buildFakePrisma();
    fakePrisma.seedUser({
      id: 'user-linked',
      email: 'linked@example.com',
      name: 'Linked User',
      role: 'USER',
      appleUserId: 'apple-sub-3',
      referredByAgentId: null,
      transactionPin: null,
      wallet: { balance: 0 },
      kyc: null,
    });
    fakePrisma.sessions.push({ userId: 'user-linked', deviceId: DEVICE_INFO.deviceId });
    const { service } = buildService(fakePrisma, {
      apple: {
        verifyIdentityToken: jest.fn().mockResolvedValue({ sub: 'apple-sub-3', emailVerified: false }),
      },
    });

    const result = await service.loginWithApple({ identityToken: 'tok', authorizationCode: 'code' } as any, DEVICE_INFO);

    // Aparèy "konni" (Session egziste deja) → pè token reyèl, pa yon defi.
    expect(result).toMatchObject({ message: 'Koneksyon reyisi', isNewUser: false });
    expect((result as any).accessToken).toBeDefined();
    expect((result as any).refreshToken).toBeDefined();
  });

  it('email deja itilize men Apple PA konfime l verifye → ConflictException (pa lye san prèv)', async () => {
    const fakePrisma = buildFakePrisma();
    fakePrisma.seedUser({
      id: 'user-existing',
      email: 'existing2@example.com',
      name: 'Existing',
      role: 'USER',
      appleUserId: null,
      wallet: { balance: 0 },
      kyc: null,
    });
    const { service } = buildService(fakePrisma, {
      apple: {
        verifyIdentityToken: jest.fn().mockResolvedValue({
          sub: 'apple-sub-4',
          email: 'existing2@example.com',
          emailVerified: false,
        }),
      },
    });

    await expect(
      service.loginWithApple({ identityToken: 'tok', authorizationCode: 'code', email: 'existing2@example.com' } as any, DEVICE_INFO),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('pa gen email ditou (ni token ni dto) epi pa gen kont ki egziste → BadRequestException', async () => {
    const fakePrisma = buildFakePrisma();
    const { service } = buildService(fakePrisma, {
      apple: {
        verifyIdentityToken: jest.fn().mockResolvedValue({ sub: 'apple-sub-5', emailVerified: false }),
      },
    });

    await expect(
      service.loginWithApple({ identityToken: 'tok', authorizationCode: 'code' } as any, DEVICE_INFO),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('bloke kreyasyon pou yon email kont rezève App Review', async () => {
    process.env.APP_REVIEW_ACCOUNT_EMAILS = 'appreview-a@ozamapay.com';
    const fakePrisma = buildFakePrisma();
    const { service } = buildService(fakePrisma, {
      apple: {
        verifyIdentityToken: jest.fn().mockResolvedValue({
          sub: 'apple-sub-6',
          email: 'appreview-a@ozamapay.com',
          emailVerified: true,
        }),
      },
    });

    await expect(
      service.loginWithApple({ identityToken: 'tok', authorizationCode: 'code' } as any, DEVICE_INFO),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(fakePrisma.usersById.size).toBe(0);
  });
});

describe('AuthService.loginWithGoogleMobile', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.clearAllMocks();
  });

  it('nouvel utilisateur: kreye kont + wallet, emailVerified=true', async () => {
    const fakePrisma = buildFakePrisma();
    const { service, mailService } = buildService(fakePrisma, {
      google: {
        verifyIdToken: jest.fn().mockResolvedValue({
          sub: 'google-sub-1',
          email: 'nouvogoogle@example.com',
          emailVerified: true,
          firstName: 'Marie',
          lastName: 'Joseph',
        }),
      },
    });

    const result = await service.loginWithGoogleMobile({ idToken: 'tok' } as any, DEVICE_INFO);

    expect(result).toMatchObject({ requiresDeviceVerification: true, isNewUser: true });
    const created = [...fakePrisma.usersById.values()][0];
    expect(created.googleId).toBe('google-sub-1');
    expect(created.emailVerified).toBe(true);
    expect(mailService.sendWelcome).toHaveBeenCalledWith('nouvogoogle@example.com', 'Marie Joseph');
  });

  it('liaison compte existant pa email, googleId poko mete', async () => {
    const fakePrisma = buildFakePrisma();
    fakePrisma.seedUser({
      id: 'user-g-existing',
      email: 'gexisting@example.com',
      name: 'G Existing',
      role: 'USER',
      googleId: null,
      wallet: { balance: 50 },
      kyc: null,
    });
    const { service } = buildService(fakePrisma, {
      google: {
        verifyIdToken: jest.fn().mockResolvedValue({
          sub: 'google-sub-2',
          email: 'gexisting@example.com',
          emailVerified: true,
        }),
      },
    });

    const result = await service.loginWithGoogleMobile({ idToken: 'tok' } as any, DEVICE_INFO);

    expect(result).toMatchObject({ isNewUser: false });
    expect(fakePrisma.usersById.get('user-g-existing').googleId).toBe('google-sub-2');
    expect(fakePrisma.usersById.size).toBe(1);
  });

  it('bloke kreyasyon pou yon email kont rezève App Review', async () => {
    process.env.APP_REVIEW_ACCOUNT_EMAILS = 'appreview-b@ozamapay.com';
    const fakePrisma = buildFakePrisma();
    const { service } = buildService(fakePrisma, {
      google: {
        verifyIdToken: jest.fn().mockResolvedValue({
          sub: 'google-sub-3',
          email: 'appreview-b@ozamapay.com',
          emailVerified: true,
        }),
      },
    });

    await expect(service.loginWithGoogleMobile({ idToken: 'tok' } as any, DEVICE_INFO)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
