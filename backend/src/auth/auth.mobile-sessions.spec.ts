import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

// Même approche que payments.service.staging.spec.ts (voir ce fichier) :
// instanciation directe de la classe avec des dépendances fausses, pas de
// TestingModule NestJS — le DI dans les specs existantes de ce repo est déjà
// cassé pour les services à beaucoup de dépendances (11 échecs connus, voir
// auth.service.spec.ts), donc on ne s'appuie pas sur lui ici.

const HASHED_PASSWORD = bcrypt.hashSync('password123', 10);

// Petit magasin en mémoire qui imite les appels Prisma utilisés par
// AuthService (login/refresh/sessions) — assez réaliste pour tester
// correctement la rotation et la détection de réutilisation en chaîne.
function buildFakePrisma(initialUser: any) {
  const users = new Map<string, any>([[initialUser.id, initialUser]]);
  const sessions = new Map<string, any>();
  let sessionCounter = 0;

  const sessionClient = {
    create: jest.fn(async ({ data }: any) => {
      sessionCounter += 1;
      const id = `session-${sessionCounter}`;
      const row = {
        id,
        revokedAt: null,
        revokedReason: null,
        replacedBySessionId: null,
        lastUsedAt: new Date(),
        createdAt: new Date(),
        ...data,
      };
      sessions.set(id, row);
      return row;
    }),
    update: jest.fn(async ({ where, data }: any) => {
      const row = sessions.get(where.id);
      if (!row) throw new Error('session not found');
      Object.assign(row, data);
      return row;
    }),
    updateMany: jest.fn(async ({ where, data }: any) => {
      let count = 0;
      for (const row of sessions.values()) {
        if (row.userId !== where.userId) continue;
        if (where.revokedAt === null && row.revokedAt !== null) continue;
        if (where.id?.not && row.id === where.id.not) continue;
        Object.assign(row, data);
        count += 1;
      }
      return { count };
    }),
    findUnique: jest.fn(async ({ where }: any) => {
      if (where.id) return sessions.get(where.id) ?? null;
      if (where.refreshTokenHash) {
        for (const row of sessions.values()) {
          if (row.refreshTokenHash === where.refreshTokenHash) return row;
        }
        return null;
      }
      return null;
    }),
    findMany: jest.fn(async ({ where }: any) => {
      return Array.from(sessions.values()).filter(
        (row) => row.userId === where.userId && (where.revokedAt === null ? row.revokedAt === null : true),
      );
    }),
  };

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
    $transaction: jest.fn(async (cb: any) => cb({ session: sessionClient })),
  };
}

function buildService(fakePrisma: any) {
  const jwtService = {
    sign: jest.fn((payload: any) => `signed.${JSON.stringify(payload)}`),
    verify: jest.fn(),
  };
  const mailService = { sendVerificationEmail: jest.fn(), sendWelcome: jest.fn() };
  const twoFactorService = {};
  const tokenBlacklist = { add: jest.fn(), has: jest.fn().mockResolvedValue(false) };
  return new AuthService(fakePrisma as any, jwtService as any, mailService as any, twoFactorService as any, tokenBlacklist as any);
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
    wallet: { balance: 100 },
    kyc: null,
    ...overrides,
  };
}

describe('AuthService.login — webapp (sans X-Device-Id) INCHANGÉ', () => {
  it('retourne { message, token, user } — pas de accessToken/refreshToken, aucune Session créée', async () => {
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    const service = buildService(fakePrisma);

    const result = await service.login({ email: user.email, password: 'password123' } as any);

    expect(result).toHaveProperty('token');
    expect(result).not.toHaveProperty('accessToken');
    expect(result).not.toHaveProperty('refreshToken');
    expect(fakePrisma.session.create).not.toHaveBeenCalled();
  });
});

describe('AuthService.login — app mobile (X-Device-Id présent)', () => {
  it('retourne { message, accessToken, refreshToken, expiresIn, user } et crée une Session', async () => {
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    const service = buildService(fakePrisma);

    const result = await service.login(
      { email: user.email, password: 'password123' } as any,
      '1.2.3.4',
      'ozamapay-app/1.0',
      { deviceId: 'device-abc', deviceName: 'iPhone 15', platform: 'ios' },
    );

    expect(result).not.toHaveProperty('token');
    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    expect(result).toHaveProperty('expiresIn', 15 * 60);
    expect(fakePrisma.session.create).toHaveBeenCalledTimes(1);
    expect(fakePrisma.session.create.mock.calls[0][0].data.deviceId).toBe('device-abc');
  });
});

describe('AuthService.refresh — rotation + détection de réutilisation', () => {
  async function loginMobile(fakePrisma: any, service: AuthService, user: any) {
    return service.login(
      { email: user.email, password: 'password123' } as any,
      '1.2.3.4',
      'ozamapay-app/1.0',
      { deviceId: 'device-abc' },
    );
  }

  it('un refresh valide rotationne : nouveau pair émis, ancienne session marquée "rotation"', async () => {
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    const service = buildService(fakePrisma);
    const { refreshToken: firstRefresh } = (await loginMobile(fakePrisma, service, user)) as any;

    const secondPair = await service.refresh(firstRefresh);

    expect(secondPair).toHaveProperty('accessToken');
    expect(secondPair).toHaveProperty('refreshToken');
    expect(secondPair.refreshToken).not.toBe(firstRefresh);

    const firstSession = fakePrisma.sessions.get('session-1');
    expect(firstSession.revokedReason).toBe('rotation');
    expect(firstSession.replacedBySessionId).toBe('session-2');
  });

  it('réutiliser un refresh token déjà rotationné (reuse) rejette ET révoque la chaîne descendante', async () => {
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    const service = buildService(fakePrisma);
    const { refreshToken: firstRefresh } = (await loginMobile(fakePrisma, service, user)) as any;

    await service.refresh(firstRefresh); // rotation normale → session-2 créée

    // Rejouer l'ANCIEN refresh (déjà rotationné) = signal de vol potentiel
    await expect(service.refresh(firstRefresh)).rejects.toThrow(UnauthorizedException);

    const descendant = fakePrisma.sessions.get('session-2');
    expect(descendant.revokedAt).not.toBeNull();
    expect(descendant.revokedReason).toBe('reuse_detected');
  });

  it('un refresh token expiré est rejeté', async () => {
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    const service = buildService(fakePrisma);
    const { refreshToken } = (await loginMobile(fakePrisma, service, user)) as any;

    const session = fakePrisma.sessions.get('session-1');
    session.expiresAt = new Date(Date.now() - 1000);

    await expect(service.refresh(refreshToken)).rejects.toThrow(UnauthorizedException);
  });

  it('un refresh token inconnu est rejeté', async () => {
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    const service = buildService(fakePrisma);

    await expect(service.refresh('token-qui-nexiste-pas')).rejects.toThrow(UnauthorizedException);
  });
});

describe('AuthService — sessions (liste/révocation, isolées par utilisateur)', () => {
  it('listSessions ne retourne que les sessions non révoquées de cet utilisateur, marque "current"', async () => {
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    const service = buildService(fakePrisma);
    await service.login({ email: user.email, password: 'password123' } as any, undefined, undefined, { deviceId: 'd1' });

    const list = await service.listSessions(user.id, 'session-1');
    expect(list).toHaveLength(1);
    expect(list[0].current).toBe(true);
  });

  it('revokeSession rejette si la session appartient à un autre utilisateur', async () => {
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    const service = buildService(fakePrisma);
    await service.login({ email: user.email, password: 'password123' } as any, undefined, undefined, { deviceId: 'd1' });

    await expect(service.revokeSession('un-autre-user', 'session-1')).rejects.toThrow();
  });

  it('revokeAllSessions exclut la session courante par défaut', async () => {
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    const service = buildService(fakePrisma);
    await service.login({ email: user.email, password: 'password123' } as any, undefined, undefined, { deviceId: 'd1' });
    await service.login({ email: user.email, password: 'password123' } as any, undefined, undefined, { deviceId: 'd2' });

    await service.revokeAllSessions(user.id, 'session-1', false);

    expect(fakePrisma.sessions.get('session-1').revokedAt).toBeNull();
    expect(fakePrisma.sessions.get('session-2').revokedAt).not.toBeNull();
  });
});
