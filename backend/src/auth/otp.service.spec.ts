import { BadRequestException, HttpException } from '@nestjs/common';
import { OtpService } from './otp.service';

// Magasin en mémoire pour User/OtpCode — assez réaliste pour tester
// expiration, max tentatives, et le rate-limit par compte (basé sur
// OtpCode.createdAt, pas de table séparée).
function buildFakePrisma(user: any) {
  const users = new Map<string, any>([[user.id, user]]);
  const otpCodes = new Map<string, any>();
  let counter = 0;

  return {
    otpCodes,
    user: {
      findUnique: jest.fn(async ({ where }: any) => {
        if (where.id) return users.get(where.id) ?? null;
        if (where.email) {
          for (const u of users.values()) if (u.email === where.email) return u;
          return null;
        }
        return null;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const u = users.get(where.id);
        Object.assign(u, data);
        return u;
      }),
    },
    otpCode: {
      count: jest.fn(async ({ where }: any) => {
        let n = 0;
        for (const row of otpCodes.values()) {
          if (row.userId === where.userId && row.purpose === where.purpose && row.createdAt >= where.createdAt.gte) n += 1;
        }
        return n;
      }),
      create: jest.fn(async ({ data }: any) => {
        counter += 1;
        const row = { id: `otp-${counter}`, attempts: 0, consumedAt: null, createdAt: new Date(), ...data };
        otpCodes.set(row.id, row);
        return row;
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        let count = 0;
        for (const row of otpCodes.values()) {
          if (row.userId === where.userId && row.purpose === where.purpose && row.consumedAt === null) {
            Object.assign(row, data);
            count += 1;
          }
        }
        return { count };
      }),
      findFirst: jest.fn(async ({ where }: any) => {
        const matches = Array.from(otpCodes.values())
          .filter((row) => row.userId === where.userId && row.purpose === where.purpose && row.consumedAt === null)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return matches[0] ?? null;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const row = otpCodes.get(where.id);
        Object.assign(row, data);
        return row;
      }),
    },
  };
}

function makeUser(overrides: Partial<any> = {}) {
  return { id: 'user-1', email: 'client@example.com', name: 'Client', emailVerified: false, ...overrides };
}

function buildService(fakePrisma: any, authServiceOverrides: any = {}) {
  const mailService = { sendOtpCode: jest.fn() };
  const authService = {
    verifyChallengeToken: jest.fn(),
    completeDeviceVerification: jest.fn(),
    ...authServiceOverrides,
  };
  const jwtService = { verify: jest.fn(), sign: jest.fn() };
  const service = new OtpService(fakePrisma as any, mailService as any, authService as any, jwtService as any);
  return { service, mailService, authService, jwtService };
}

// Récupère le code en clair envoyé à sendOtpCode (jamais via la DB/la
// réponse API — exactement le canal que suit un email réel).
function extractSentCode(mailService: any): string {
  return mailService.sendOtpCode.mock.calls[0][2];
}

describe('OtpService.send — purpose=register (via Authorization: Bearer)', () => {
  it('génère un code 6 chiffres, le hache, et ne le retourne jamais dans la réponse', async () => {
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    const { service, mailService, jwtService } = buildService(fakePrisma);
    jwtService.verify.mockReturnValue({ sub: user.id });

    const result = await service.send({ purpose: 'register' } as any, 'Bearer sometoken');

    expect(result).not.toHaveProperty('code');
    expect(JSON.stringify(result)).not.toMatch(/\d{6}/);
    expect(mailService.sendOtpCode).toHaveBeenCalledTimes(1);
    const code = extractSentCode(mailService);
    expect(code).toMatch(/^\d{6}$/);

    const stored = Array.from(fakePrisma.otpCodes.values())[0];
    expect(stored.codeHash).not.toBe(code); // haché, jamais en clair en base
  });

  it('rejette si aucun Authorization header (purpose=register exige un token)', async () => {
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    const { service } = buildService(fakePrisma);

    await expect(service.send({ purpose: 'register' } as any, undefined)).rejects.toThrow();
  });
});

describe('OtpService.send — rate limit par compte (3 / 10 min)', () => {
  it('rejette la 4e demande dans la fenêtre avec 429', async () => {
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    const { service, jwtService } = buildService(fakePrisma);
    jwtService.verify.mockReturnValue({ sub: user.id });

    await service.send({ purpose: 'register' } as any, 'Bearer t');
    await service.send({ purpose: 'register' } as any, 'Bearer t');
    await service.send({ purpose: 'register' } as any, 'Bearer t');

    await expect(service.send({ purpose: 'register' } as any, 'Bearer t')).rejects.toThrow(HttpException);
  });
});

describe('OtpService.send — purpose=reset (anti-énumération)', () => {
  it('email inconnu → même message générique, AUCUN OtpCode créé, aucun email envoyé', async () => {
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    const { service, mailService } = buildService(fakePrisma);

    const result = await service.send({ purpose: 'reset', email: 'inconnu@example.com' } as any);

    expect(result.message).toMatch(/Si demand lan valid/);
    expect(fakePrisma.otpCodes.size).toBe(0);
    expect(mailService.sendOtpCode).not.toHaveBeenCalled();
  });
});

describe('OtpService.verify', () => {
  async function sendAndGetCode(fakePrisma: any, service: OtpService, mailService: any, jwtService: any, user: any) {
    jwtService.verify.mockReturnValue({ sub: user.id });
    await service.send({ purpose: 'register' } as any, 'Bearer t');
    return extractSentCode(mailService);
  }

  it('un bon code marque emailVerified=true (purpose=register)', async () => {
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    const { service, mailService, jwtService } = buildService(fakePrisma);
    const code = await sendAndGetCode(fakePrisma, service, mailService, jwtService, user);

    const result = await service.verify({ purpose: 'register', code } as any, 'Bearer t');

    expect(result.emailVerified).toBe(true);
    expect(user.emailVerified).toBe(true);
  });

  it('un mauvais code est rejeté et incrémente les tentatives', async () => {
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    const { service, mailService, jwtService } = buildService(fakePrisma);
    await sendAndGetCode(fakePrisma, service, mailService, jwtService, user);

    await expect(service.verify({ purpose: 'register', code: '000000' } as any, 'Bearer t')).rejects.toThrow(
      BadRequestException,
    );
    const stored = Array.from(fakePrisma.otpCodes.values())[0];
    expect(stored.attempts).toBe(1);
  });

  it('5 mauvaises tentatives bloquent même un bon code ensuite', async () => {
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    const { service, mailService, jwtService } = buildService(fakePrisma);
    const code = await sendAndGetCode(fakePrisma, service, mailService, jwtService, user);

    for (let i = 0; i < 5; i++) {
      await expect(service.verify({ purpose: 'register', code: '000000' } as any, 'Bearer t')).rejects.toThrow();
    }

    await expect(service.verify({ purpose: 'register', code } as any, 'Bearer t')).rejects.toThrow(
      /Twòp tantativ/,
    );
  });

  it('un code expiré est rejeté même si correct', async () => {
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    const { service, mailService, jwtService } = buildService(fakePrisma);
    const code = await sendAndGetCode(fakePrisma, service, mailService, jwtService, user);
    const stored = Array.from(fakePrisma.otpCodes.values())[0];
    stored.expiresAt = new Date(Date.now() - 1000);

    await expect(service.verify({ purpose: 'register', code } as any, 'Bearer t')).rejects.toThrow(/ekspire/);
  });

  it('purpose=new_device délègue à authService.completeDeviceVerification après un bon code', async () => {
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    const { service, mailService, authService } = buildService(fakePrisma);
    authService.verifyChallengeToken.mockResolvedValue({ userId: user.id, deviceInfo: { deviceId: 'd1' } });
    authService.completeDeviceVerification.mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' });

    await service.send({ purpose: 'new_device', challengeToken: 'ct' } as any);
    const code = extractSentCode(mailService);

    const result = await service.verify({ purpose: 'new_device', code, challengeToken: 'ct' } as any);

    expect(authService.completeDeviceVerification).toHaveBeenCalledWith(user.id, { deviceId: 'd1' });
    expect(result).toEqual({ accessToken: 'at', refreshToken: 'rt' });
  });

  it('purpose=register via challengeToken (app mobile, lo L3) : vérifie emailVerified=true PUIS délègue à completeDeviceVerification', async () => {
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    const { service, mailService, authService } = buildService(fakePrisma);
    authService.verifyChallengeToken.mockResolvedValue({ userId: user.id, deviceInfo: { deviceId: 'd2' } });
    authService.completeDeviceVerification.mockResolvedValue({ accessToken: 'at2', refreshToken: 'rt2', expiresIn: 900 });

    await service.send({ purpose: 'register', challengeToken: 'ct' } as any);
    const code = extractSentCode(mailService);

    const result = await service.verify({ purpose: 'register', code, challengeToken: 'ct' } as any);

    expect(user.emailVerified).toBe(true);
    expect(authService.completeDeviceVerification).toHaveBeenCalledWith(user.id, { deviceId: 'd2' });
    expect(result).toEqual({ accessToken: 'at2', refreshToken: 'rt2', expiresIn: 900 });
  });

  it('purpose=register via Bearer (sans deviceInfo) garde l\'ancien comportement : juste emailVerified, pas de tokens', async () => {
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    const { service, mailService, jwtService, authService } = buildService(fakePrisma);
    const code = await sendAndGetCode(fakePrisma, service, mailService, jwtService, user);

    const result = await service.verify({ purpose: 'register', code } as any, 'Bearer t');

    expect(result).toEqual({ message: expect.any(String), emailVerified: true });
    expect(authService.completeDeviceVerification).not.toHaveBeenCalled();
  });
});
