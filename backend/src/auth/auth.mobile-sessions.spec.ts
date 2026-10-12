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
// AuthService (login/refresh/sessions/device-challenge) — assez réaliste
// pour tester correctement la rotation et la détection de réutilisation.
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
    findFirst: jest.fn(async ({ where }: any) => {
      for (const row of sessions.values()) {
        if (row.userId === where.userId && row.deviceId === where.deviceId) return row;
      }
      return null;
    }),
    findMany: jest.fn(async ({ where }: any) => {
      return Array.from(sessions.values()).filter(
        (row) => row.userId === where.userId && (where.revokedAt === null ? row.revokedAt === null : true),
      );
    }),
  };

  const deletionRequests = new Map<string, any>();
  const accountDeletionRequest = {
    findFirst: jest.fn(async ({ where }: any) => {
      for (const row of deletionRequests.values()) {
        if (row.userId === where.userId && row.status === where.status) return row;
      }
      return null;
    }),
    update: jest.fn(async ({ where, data }: any) => {
      const row = deletionRequests.get(where.id);
      Object.assign(row, data);
      return row;
    }),
  };

  return {
    sessions,
    deletionRequests,
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
    $transaction: jest.fn(async (cb: any) => cb({ session: sessionClient })),
  };
}

// jwtService.sign/verify réels (pas de mock) pour signChallengeToken/
// verifyChallengeToken — un simple objet JSON ne suffit pas, il faut un
// vrai aller-retour JWT pour ces tests.
function buildJwtService() {
  const jwt = require('jsonwebtoken');
  const secret = 'test-secret-l1-l2';
  return {
    sign: jest.fn((payload: any, options?: any) => jwt.sign(payload, secret, options)),
    verify: jest.fn((token: string) => jwt.verify(token, secret)),
  };
}

function buildService(fakePrisma: any, tokenBlacklistOverrides: any = {}) {
  const jwtService = buildJwtService();
  const mailService = {
    sendVerificationEmail: jest.fn(),
    sendWelcome: jest.fn(),
    sendNewDeviceAlert: jest.fn(),
  };
  const twoFactorService = {};
  const tokenBlacklist = { add: jest.fn(), has: jest.fn().mockResolvedValue(false), ...tokenBlacklistOverrides };
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
    emailVerified: true,
    wallet: { balance: 100 },
    kyc: null,
    ...overrides,
  };
}

// Simule le parcours complet d'un PREMIER login mobile réussi : login()
// renvoie un défi (nouvel appareil), puis completeDeviceVerification()
// représente un OTP purpose=new_device vérifié avec succès (testé
// séparément dans otp.service.spec.ts) — ce helper donne un vrai pair
// accessToken/refreshToken aux tests qui testent autre chose (rotation,
// sessions...) sans redupliquer la logique OTP partout.
async function loginMobileKnownDevice(
  service: AuthService,
  user: any,
  deviceId = 'device-abc',
  deviceName?: string,
  platform?: string,
) {
  return service.completeDeviceVerification(user.id, { deviceId, deviceName, platform });
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

describe('AuthService.login — app mobile, NOUVEL appareil (lo L2)', () => {
  it('ne délivre AUCUN token — renvoie requiresDeviceVerification + challengeToken', async () => {
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
});

describe('AuthService.login — app mobile, appareil DÉJÀ connu', () => {
  it('délivre directement accessToken/refreshToken, pas de défi', async () => {
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    const service = buildService(fakePrisma);

    // Un 1er login+vérif sur ce device a déjà eu lieu avant ce test
    // (simulé directement via completeDeviceVerification).
    await loginMobileKnownDevice(service, user, 'device-abc');

    const result = await service.login(
      { email: user.email, password: 'password123' } as any,
      '1.2.3.4',
      'ozamapay-app/1.0',
      { deviceId: 'device-abc' },
    );

    expect(result).not.toHaveProperty('requiresDeviceVerification');
    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
  });
});

describe('AuthService.signChallengeToken / verifyChallengeToken', () => {
  it('un challengeToken valide se vérifie et retourne userId + deviceInfo', async () => {
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    const service = buildService(fakePrisma);

    const token = service.signChallengeToken(user.id, { deviceId: 'device-abc', deviceName: 'iPhone' });
    const resolved = await service.verifyChallengeToken(token);

    expect(resolved.userId).toBe(user.id);
    expect(resolved.deviceInfo.deviceId).toBe('device-abc');
  });

  it('un challengeToken déjà blacklisté (consommé par /auth/device/not-me) est rejeté', async () => {
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    const service = buildService(fakePrisma, { has: jest.fn().mockResolvedValue(true) });

    const token = service.signChallengeToken(user.id, { deviceId: 'device-abc' });

    await expect(service.verifyChallengeToken(token)).rejects.toThrow(UnauthorizedException);
  });
});

describe('AuthService.notMeDevice', () => {
  it('blacklist le jti du challenge et envoie une alerte email', async () => {
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    const service = buildService(fakePrisma);
    const token = service.signChallengeToken(user.id, { deviceId: 'device-abc', deviceName: 'iPhone 15' });

    await service.notMeDevice(token);

    const mailService = (service as any).mailService;
    expect(mailService.sendNewDeviceAlert).toHaveBeenCalledTimes(1);
    expect(mailService.sendNewDeviceAlert.mock.calls[0][0]).toBe(user.email);
  });
});

describe('AuthService.refresh — rotation + détection de réutilisation', () => {
  it('un refresh valide rotationne : nouveau pair émis, ancienne session marquée "rotation"', async () => {
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    const service = buildService(fakePrisma);
    const { refreshToken: firstRefresh } = (await loginMobileKnownDevice(service, user)) as any;

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
    const { refreshToken: firstRefresh } = (await loginMobileKnownDevice(service, user)) as any;

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
    const { refreshToken } = (await loginMobileKnownDevice(service, user)) as any;

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
    await loginMobileKnownDevice(service, user, 'd1');

    const list = await service.listSessions(user.id, 'session-1');
    expect(list).toHaveLength(1);
    expect(list[0].current).toBe(true);
  });

  it('revokeSession rejette si la session appartient à un autre utilisateur', async () => {
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    const service = buildService(fakePrisma);
    await loginMobileKnownDevice(service, user, 'd1');

    await expect(service.revokeSession('un-autre-user', 'session-1')).rejects.toThrow();
  });

  it('revokeAllSessions exclut la session courante par défaut', async () => {
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    const service = buildService(fakePrisma);
    await loginMobileKnownDevice(service, user, 'd1');
    await loginMobileKnownDevice(service, user, 'd2');

    await service.revokeAllSessions(user.id, 'session-1', false);

    expect(fakePrisma.sessions.get('session-1').revokedAt).toBeNull();
    expect(fakePrisma.sessions.get('session-2').revokedAt).not.toBeNull();
  });
});

describe('AuthService.login — suppression de compte différée (lo L4)', () => {
  it('bloque le login si le compte a déjà été exécuté (deletionExecutedAt)', async () => {
    const user = makeUser({ deletionExecutedAt: new Date() });
    const fakePrisma = buildFakePrisma(user);
    const service = buildService(fakePrisma);

    await expect(service.login({ email: user.email, password: 'password123' } as any)).rejects.toThrow(
      /dezaktive/,
    );
  });

  it('un login webapp réussi ANNULE automatiquement une demande PENDING et le signale (deletionCancelled)', async () => {
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    fakePrisma.deletionRequests.set('req-1', {
      id: 'req-1',
      userId: user.id,
      status: 'PENDING',
      cancelledAt: null,
    });
    const service = buildService(fakePrisma);

    const result: any = await service.login({ email: user.email, password: 'password123' } as any);

    expect(result.deletionCancelled).toBe(true);
    expect(fakePrisma.deletionRequests.get('req-1').status).toBe('CANCELLED');
  });

  it("un login webapp SANS demande pending ne change RIEN à la réponse (pas de clé deletionCancelled) — régression webapp", async () => {
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    const service = buildService(fakePrisma);

    const result: any = await service.login({ email: user.email, password: 'password123' } as any);

    expect(result).not.toHaveProperty('deletionCancelled');
    expect(result).toEqual({ message: expect.any(String), token: expect.any(String), user: expect.any(Object) });
  });

  it('un login mobile sur device déjà connu annule aussi la demande PENDING', async () => {
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    const service = buildService(fakePrisma);
    await loginMobileKnownDevice(service, user, 'device-abc');
    fakePrisma.deletionRequests.set('req-1', {
      id: 'req-1',
      userId: user.id,
      status: 'PENDING',
      cancelledAt: null,
    });

    const result: any = await service.login(
      { email: user.email, password: 'password123' } as any,
      undefined,
      undefined,
      { deviceId: 'device-abc' },
    );

    expect(result.deletionCancelled).toBe(true);
    expect(result).toHaveProperty('accessToken');
  });
});
