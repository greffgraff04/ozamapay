import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

// Même approche que auth.mobile-sessions.spec.ts (voir ce fichier) —
// instanciation directe, pas de TestingModule NestJS (DI cassé pour les
// specs existantes à grosses dépendances, 11 échecs connus).

const HASHED_PASSWORD = bcrypt.hashSync('password123', 10);
const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  jest.clearAllMocks();
});

function buildFakePrisma(initialUser: any) {
  const users = new Map<string, any>([[initialUser.id, initialUser]]);
  const sessions = new Map<string, any>();
  let sessionCounter = 0;

  const sessionClient = {
    create: jest.fn(async ({ data }: any) => {
      sessionCounter += 1;
      const id = `session-${sessionCounter}`;
      const row = { id, revokedAt: null, createdAt: new Date(), ...data };
      sessions.set(id, row);
      return row;
    }),
    findFirst: jest.fn(async ({ where }: any) => {
      for (const row of sessions.values()) {
        if (row.userId === where.userId && row.deviceId === where.deviceId) return row;
      }
      return null;
    }),
  };

  const accountDeletionRequest = { findFirst: jest.fn().mockResolvedValue(null) };

  return {
    sessions,
    user: {
      findUnique: jest.fn(async ({ where }: any) => users.get(where.id ?? '') ?? (where.email ? initialUser : null)),
      update: jest.fn(async ({ where, data }: any) => {
        const u = users.get(where.id);
        Object.assign(u, data);
        return u;
      }),
    },
    session: sessionClient,
    adminSession: { updateMany: jest.fn(), create: jest.fn() },
    accountDeletionRequest,
  };
}

function buildJwtService() {
  const jwt = require('jsonwebtoken');
  const secret = 'test-secret-new-device-flag';
  return {
    sign: jest.fn((payload: any, options?: any) => jwt.sign(payload, secret, options)),
    verify: jest.fn((token: string) => jwt.verify(token, secret)),
  };
}

function buildService(fakePrisma: any) {
  const jwtService = buildJwtService();
  const mailService = { sendVerificationEmail: jest.fn(), sendWelcome: jest.fn(), sendNewDeviceAlert: jest.fn() };
  const twoFactorService = {};
  const tokenBlacklist = { add: jest.fn(), has: jest.fn().mockResolvedValue(false) };
  return new AuthService(
    fakePrisma as any,
    jwtService as any,
    mailService as any,
    twoFactorService as any,
    tokenBlacklist as any,
    {} as any,
    {} as any,
  );
}

function makeUser(overrides: Partial<any> = {}) {
  return {
    id: 'user-1',
    email: 'client@example.com',
    password: HASHED_PASSWORD,
    name: 'Client',
    role: 'USER',
    referredByAgentId: null,
    transactionPin: null,
    failedLoginAttempts: 0,
    loginLockedUntil: null,
    isSuspended: false,
    emailVerified: true,
    wallet: { balance: 100 },
    kyc: null,
    appleUserId: null,
    googleId: null,
    ...overrides,
  };
}

describe('AuthService.login — OTP_NEW_DEVICE_ENABLED flag, nouvel appareil', () => {
  it('flag absent (défaut) → OTP toujours exigé, comportement inchangé', async () => {
    delete process.env.OTP_NEW_DEVICE_ENABLED;
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    const service = buildService(fakePrisma);

    const result = await service.login(
      { email: user.email, password: 'password123' } as any,
      '1.2.3.4',
      'ozamapay-app/1.0',
      { deviceId: 'device-abc', deviceName: 'iPhone 15', platform: 'ios' },
    );

    expect(result).toEqual({ requiresDeviceVerification: true, challengeToken: expect.any(String) });
    expect(fakePrisma.session.create).not.toHaveBeenCalled();
  });

  it('flag="true" explicite → même résultat que l\'absence du flag', async () => {
    process.env.OTP_NEW_DEVICE_ENABLED = 'true';
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    const service = buildService(fakePrisma);

    const result = await service.login(
      { email: user.email, password: 'password123' } as any,
      '1.2.3.4',
      'ozamapay-app/1.0',
      { deviceId: 'device-abc' },
    );

    expect(result).toEqual({ requiresDeviceVerification: true, challengeToken: expect.any(String) });
  });

  it('flag="false" → PAS de défi OTP, tokens délivrés directement, Session créée (appareil marqué "connu")', async () => {
    process.env.OTP_NEW_DEVICE_ENABLED = 'false';
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    const service = buildService(fakePrisma);

    const result = await service.login(
      { email: user.email, password: 'password123' } as any,
      '1.2.3.4',
      'ozamapay-app/1.0',
      { deviceId: 'device-abc', deviceName: 'iPhone 15', platform: 'ios' },
    );

    expect(result).not.toHaveProperty('requiresDeviceVerification');
    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    expect(fakePrisma.session.create).toHaveBeenCalledTimes(1);
  });

  it('flag="false" → logge [SECURITY] new_device_login_without_otp avec userId/ip/device', async () => {
    process.env.OTP_NEW_DEVICE_ENABLED = 'false';
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    const service = buildService(fakePrisma);
    const warnSpy = jest.spyOn((service as any).logger, 'warn').mockImplementation(() => {});

    await service.login(
      { email: user.email, password: 'password123' } as any,
      '9.8.7.6',
      'ozamapay-app/1.0',
      { deviceId: 'device-xyz', deviceName: 'Pixel 9', platform: 'android' },
    );

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[SECURITY] new_device_login_without_otp'),
    );
    const logLine = warnSpy.mock.calls[0][0] as string;
    expect(logLine).toContain('userId=user-1');
    expect(logLine).toContain('ip=9.8.7.6');
    expect(logLine).toContain('deviceId=device-xyz');
  });

  it('flag="false" sur un appareil DÉJÀ connu → comportement normal inchangé, aucun log [SECURITY]', async () => {
    process.env.OTP_NEW_DEVICE_ENABLED = 'false';
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    const service = buildService(fakePrisma);
    const warnSpy = jest.spyOn((service as any).logger, 'warn').mockImplementation(() => {});

    // 1er login — device inconnu, enregistré comme "connu" via Session.
    await service.login(
      { email: user.email, password: 'password123' } as any,
      '1.2.3.4',
      'ozamapay-app/1.0',
      { deviceId: 'device-abc' },
    );
    warnSpy.mockClear();

    // 2e login — même device, déjà "connu".
    const result = await service.login(
      { email: user.email, password: 'password123' } as any,
      '1.2.3.4',
      'ozamapay-app/1.0',
      { deviceId: 'device-abc' },
    );

    expect(result).not.toHaveProperty('requiresDeviceVerification');
    expect(result).toHaveProperty('accessToken');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('remise du flag à "true" après un login sans OTP → pas de déconnexion forcée, le même appareil reste "connu"', async () => {
    process.env.OTP_NEW_DEVICE_ENABLED = 'false';
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    const service = buildService(fakePrisma);

    // Login pendant que le flag est désactivé — device devient "connu".
    await service.login(
      { email: user.email, password: 'password123' } as any,
      '1.2.3.4',
      'ozamapay-app/1.0',
      { deviceId: 'device-abc' },
    );

    // Flag remis à true ensuite — MÊME appareil doit encore passer sans OTP
    // (Session existe déjà), seul un appareil VRAIMENT nouveau serait bloqué.
    process.env.OTP_NEW_DEVICE_ENABLED = 'true';
    const result = await service.login(
      { email: user.email, password: 'password123' } as any,
      '1.2.3.4',
      'ozamapay-app/1.0',
      { deviceId: 'device-abc' },
    );

    expect(result).not.toHaveProperty('requiresDeviceVerification');
    expect(result).toHaveProperty('accessToken');
  });

  it('flag="false" n\'affecte jamais le webapp (sans X-Device-Id) — toujours { message, token, user }', async () => {
    process.env.OTP_NEW_DEVICE_ENABLED = 'false';
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    const service = buildService(fakePrisma);

    const result = await service.login({ email: user.email, password: 'password123' } as any);

    expect(result).toHaveProperty('token');
    expect(result).not.toHaveProperty('accessToken');
    expect(fakePrisma.session.create).not.toHaveBeenCalled();
  });
});

describe('AuthService.completeSocialLogin (Apple/Google mobile) — OTP_NEW_DEVICE_ENABLED flag', () => {
  it('flag absent → requiresDeviceVerification sur un nouvel appareil (inchangé)', async () => {
    delete process.env.OTP_NEW_DEVICE_ENABLED;
    const user = makeUser({ googleId: 'google-sub-1' });
    const fakePrisma = buildFakePrisma(user);
    const service = buildService(fakePrisma);

    const result = await (service as any).completeSocialLogin(user, { deviceId: 'device-abc', ipAddress: '1.2.3.4' }, false);

    expect(result).toMatchObject({ requiresDeviceVerification: true, isNewUser: false, email: user.email });
    expect(fakePrisma.session.create).not.toHaveBeenCalled();
  });

  it('flag="false" → tokens délivrés directement + log [SECURITY] (userId/ip/device)', async () => {
    process.env.OTP_NEW_DEVICE_ENABLED = 'false';
    const user = makeUser({ googleId: 'google-sub-1' });
    const fakePrisma = buildFakePrisma(user);
    const service = buildService(fakePrisma);
    const warnSpy = jest.spyOn((service as any).logger, 'warn').mockImplementation(() => {});

    const result = await (service as any).completeSocialLogin(
      user,
      { deviceId: 'device-abc', ipAddress: '5.6.7.8', platform: 'ios' },
      false,
    );

    expect(result).not.toHaveProperty('requiresDeviceVerification');
    expect(result).toHaveProperty('accessToken');
    expect(fakePrisma.session.create).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[SECURITY] new_device_login_without_otp'));
    expect(warnSpy.mock.calls[0][0]).toContain('ip=5.6.7.8');
  });
});
