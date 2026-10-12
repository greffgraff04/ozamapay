import { AuthService } from './auth.service';

// Même approche que auth.mobile-sessions.spec.ts / payments.service.staging
// .spec.ts : instanciation directe, pas de TestingModule NestJS (DI cassé
// pour les specs existantes à grosses dépendances — 11 échecs connus).

function buildFakePrisma() {
  const usersByEmail = new Map<string, any>();
  let counter = 0;

  return {
    usersByEmail,
    user: {
      findUnique: jest.fn(async ({ where }: any) =>
        where.email ? usersByEmail.get(where.email) ?? null : null,
      ),
      update: jest.fn(async ({ where, data }: any) => {
        const u = Array.from(usersByEmail.values()).find((row: any) => row.id === where.id);
        if (u) Object.assign(u, data);
        return u;
      }),
    },
    agent: { findUnique: jest.fn() },
    $transaction: jest.fn(async (cb: any) =>
      cb({
        user: {
          create: jest.fn(async ({ data }: any) => {
            counter += 1;
            const row = { id: `new-user-${counter}`, ...data };
            usersByEmail.set(data.email, row);
            return row;
          }),
        },
        wallet: { create: jest.fn(async () => ({})) },
      }),
    ),
  };
}

function buildJwtService() {
  const jwt = require('jsonwebtoken');
  const secret = 'test-secret-l3';
  return {
    sign: jest.fn((payload: any, options?: any) => jwt.sign(payload, secret, options)),
    verify: jest.fn((token: string) => jwt.verify(token, secret)),
  };
}

function buildService(fakePrisma: any) {
  const jwtService = buildJwtService();
  const mailService = { sendVerificationEmail: jest.fn(), sendWelcome: jest.fn() };
  const twoFactorService = {};
  const tokenBlacklist = { add: jest.fn(), has: jest.fn().mockResolvedValue(false) };
  return new AuthService(fakePrisma as any, jwtService as any, mailService as any, twoFactorService as any, tokenBlacklist as any);
}

describe('AuthService.register — webapp (sans X-Device-Id) INCHANGÉ', () => {
  it('retourne { message, token, user } — pas de requiresEmailVerification/challengeToken', async () => {
    const fakePrisma = buildFakePrisma();
    const service = buildService(fakePrisma);

    const result = await service.register({ email: 'a@b.com', name: 'A B', password: 'secret1' } as any);

    expect(result).toHaveProperty('token');
    expect(result).toHaveProperty('user');
    expect(result).not.toHaveProperty('requiresEmailVerification');
    expect(result).not.toHaveProperty('challengeToken');
  });

  it('rejette toujours un email déjà utilisé, identiquement aujourd\'hui', async () => {
    const fakePrisma = buildFakePrisma();
    fakePrisma.usersByEmail.set('existe@b.com', { id: 'u0', email: 'existe@b.com' });
    const service = buildService(fakePrisma);

    await expect(
      service.register({ email: 'existe@b.com', name: 'A', password: 'secret1' } as any),
    ).rejects.toThrow(/deja itilize/);
  });
});

describe('AuthService.register — app mobile (X-Device-Id présent)', () => {
  it('crée le compte mais ne délivre AUCUN token — renvoie requiresEmailVerification + challengeToken', async () => {
    const fakePrisma = buildFakePrisma();
    const service = buildService(fakePrisma);

    const result = await service.register(
      { email: 'mobile@b.com', name: 'Mobile User', password: 'secret1' } as any,
      { deviceId: 'device-xyz', deviceName: 'iPhone', platform: 'ios' },
    );

    expect(result).toEqual({
      message: expect.any(String),
      requiresEmailVerification: true,
      challengeToken: expect.any(String),
    });
    expect(result).not.toHaveProperty('token');
    expect(result).not.toHaveProperty('accessToken');
    // Le compte existe bel et bien malgré l'absence de token.
    expect(fakePrisma.usersByEmail.get('mobile@b.com')).toBeDefined();
  });

  it('le challengeToken renvoyé se vérifie et porte le bon deviceId', async () => {
    const fakePrisma = buildFakePrisma();
    const service = buildService(fakePrisma);

    const result: any = await service.register(
      { email: 'mobile2@b.com', name: 'Mobile', password: 'secret1' } as any,
      { deviceId: 'device-xyz' },
    );
    const resolved = await service.verifyChallengeToken(result.challengeToken);

    expect(resolved.userId).toBe(fakePrisma.usersByEmail.get('mobile2@b.com').id);
    expect(resolved.deviceInfo.deviceId).toBe('device-xyz');
  });
});

describe('AuthService.login — app mobile, compte non vérifié (lo L3)', () => {
  it('relance le défi OTP "register" — jamais de token, même si le device a déjà une Session', async () => {
    const fakePrisma = buildFakePrisma();
    const service = buildService(fakePrisma);
    const bcrypt = require('bcrypt');
    const hashed = bcrypt.hashSync('password123', 10);
    fakePrisma.usersByEmail.set('nonverifie@b.com', {
      id: 'user-nv',
      email: 'nonverifie@b.com',
      password: hashed,
      name: 'Non Vérifié',
      role: 'USER',
      emailVerified: false,
      failedLoginAttempts: 0,
      loginLockedUntil: null,
      isSuspended: false,
      wallet: { balance: 0 },
      kyc: null,
    });
    // session.findFirst n'est volontairement pas mocké ici — si le code
    // appelait quand même la vérif "device connu" avant le check email,
    // ce test échouerait avec une exception plutôt que d'ignorer le bug.

    const result = await service.login(
      { email: 'nonverifie@b.com', password: 'password123' } as any,
      undefined,
      undefined,
      { deviceId: 'device-xyz' },
    );

    expect(result).toEqual({ requiresEmailVerification: true, challengeToken: expect.any(String) });
  });
});
