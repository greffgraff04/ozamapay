import { BadRequestException, ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AccountDeletionService } from './account-deletion.service';

const HASHED_PASSWORD = bcrypt.hashSync('password123', 10);

function buildFakePrisma(user: any) {
  const users = new Map<string, any>([[user.id, user]]);
  const deletionRequests = new Map<string, any>();
  let counter = 0;

  let virtualCardResult: any = null;
  let transactionResult: any = null;
  let serviceRequestResult: any = null;
  let cardCreationPendingResult: any = null;

  const accountDeletionRequest = {
    findFirst: jest.fn(async ({ where, orderBy }: any) => {
      let rows = Array.from(deletionRequests.values()).filter((r) => r.userId === where.userId);
      if (where.status) rows = rows.filter((r) => r.status === where.status);
      if (orderBy?.requestedAt === 'desc') rows = rows.sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
      return rows[0] ?? null;
    }),
    findMany: jest.fn(async ({ where }: any) =>
      Array.from(deletionRequests.values()).filter(
        (r) => r.status === where.status && r.scheduledFor <= where.scheduledFor.lte,
      ),
    ),
    create: jest.fn(async ({ data }: any) => {
      counter += 1;
      const row = { id: `req-${counter}`, status: 'PENDING', requestedAt: new Date(), cancelledAt: null, executedAt: null, ...data };
      deletionRequests.set(row.id, row);
      return row;
    }),
    update: jest.fn(async ({ where, data }: any) => {
      const row = deletionRequests.get(where.id);
      Object.assign(row, data);
      return row;
    }),
  };

  return {
    deletionRequests,
    setVirtualCardResult: (v: any) => (virtualCardResult = v),
    setTransactionResult: (v: any) => (transactionResult = v),
    setServiceRequestResult: (v: any) => (serviceRequestResult = v),
    setCardCreationPendingResult: (v: any) => (cardCreationPendingResult = v),
    user: {
      findUnique: jest.fn(async ({ where }: any) => users.get(where.id) ?? null),
      update: jest.fn(async ({ where, data }: any) => {
        const u = users.get(where.id);
        Object.assign(u, data);
        return u;
      }),
    },
    virtualCard: { findFirst: jest.fn(async () => virtualCardResult) },
    transaction: { findFirst: jest.fn(async () => transactionResult) },
    serviceRequest: { findFirst: jest.fn(async () => serviceRequestResult) },
    cardCreationPending: { findFirst: jest.fn(async () => cardCreationPendingResult) },
    accountDeletionRequest,
    $transaction: jest.fn(async (arr: Promise<any>[]) => Promise.all(arr)),
  };
}

function makeUser(overrides: Partial<any> = {}) {
  return {
    id: 'user-1',
    email: 'client@example.com',
    password: HASHED_PASSWORD,
    name: 'Client',
    wallet: { id: 'wallet-1', balance: 0 },
    agent: null,
    deletionExecutedAt: null as Date | null,
    ...overrides,
  };
}

function buildService(fakePrisma: any, overrides: any = {}) {
  const mailService = { sendAccountDeletionRequested: jest.fn() };
  const authService = { revokeAllSessions: jest.fn() };
  const otpService = { verifyCodeOnly: jest.fn() };
  const service = new AccountDeletionService(
    fakePrisma as any,
    mailService as any,
    { ...authService, ...overrides.authService } as any,
    { ...otpService, ...overrides.otpService } as any,
  );
  return { service, mailService, authService, otpService };
}

describe('AccountDeletionService.requestDeletion — re-authentification', () => {
  it('accepte un bon mot de passe', async () => {
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    const { service } = buildService(fakePrisma);

    const result = await service.requestDeletion(user.id, { password: 'password123' });

    expect(result.status).toBe('PENDING');
  });

  it('rejette un mauvais mot de passe', async () => {
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    const { service } = buildService(fakePrisma);

    await expect(service.requestDeletion(user.id, { password: 'mauvais' })).rejects.toThrow(UnauthorizedException);
  });

  it('accepte un bon code OTP (purpose=delete_account) via otpService.verifyCodeOnly', async () => {
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    const { service, otpService } = buildService(fakePrisma);
    otpService.verifyCodeOnly.mockResolvedValue(undefined);

    const result = await service.requestDeletion(user.id, { otpCode: '123456' });

    expect(otpService.verifyCodeOnly).toHaveBeenCalledWith(user.id, 'DELETE_ACCOUNT', '123456');
    expect(result.status).toBe('PENDING');
  });

  it("rejette si ni mot de passe ni code OTP n'est fourni", async () => {
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    const { service } = buildService(fakePrisma);

    await expect(service.requestDeletion(user.id, {})).rejects.toThrow(BadRequestException);
  });
});

describe('AccountDeletionService.requestDeletion — refus si solde/opération en cours', () => {
  it('refuse si le solde wallet > 0', async () => {
    const user = makeUser({ wallet: { id: 'w1', balance: 500 } });
    const fakePrisma = buildFakePrisma(user);
    const { service } = buildService(fakePrisma);

    await expect(service.requestDeletion(user.id, { password: 'password123' })).rejects.toThrow(ConflictException);
  });

  it('refuse si une carte active a un solde > 0', async () => {
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    fakePrisma.setVirtualCardResult({ id: 'card-1', status: 'ACTIVE', balance: 10 });
    const { service } = buildService(fakePrisma);

    await expect(service.requestDeletion(user.id, { password: 'password123' })).rejects.toThrow(ConflictException);
  });

  it('refuse si une transaction est PENDING/PROCESSING', async () => {
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    fakePrisma.setTransactionResult({ id: 'tx-1', status: 'PENDING' });
    const { service } = buildService(fakePrisma);

    await expect(service.requestDeletion(user.id, { password: 'password123' })).rejects.toThrow(ConflictException);
  });

  it('refuse si une demande de service (finance/échange) est en cours', async () => {
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    fakePrisma.setServiceRequestResult({ id: 'sr-1', status: 'PENDING' });
    const { service } = buildService(fakePrisma);

    await expect(service.requestDeletion(user.id, { password: 'password123' })).rejects.toThrow(ConflictException);
  });

  it('refuse si une création de carte est en attente non résolue', async () => {
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    fakePrisma.setCardCreationPendingResult({ id: 'ccp-1' });
    const { service } = buildService(fakePrisma);

    await expect(service.requestDeletion(user.id, { password: 'password123' })).rejects.toThrow(ConflictException);
  });

  it('le message de refus ne cite aucun nom de fournisseur', async () => {
    const user = makeUser({ wallet: { id: 'w1', balance: 500 } });
    const fakePrisma = buildFakePrisma(user);
    const { service } = buildService(fakePrisma);

    await expect(service.requestDeletion(user.id, { password: 'password123' })).rejects.toThrow(
      /^(?!.*StroWallet)(?!.*BSICards)(?!.*ZiiroPay).*$/is,
    );
  });
});

describe('AccountDeletionService.requestDeletion — effets de bord d\'une demande réussie', () => {
  it('programme scheduledFor à +48h, révoque toutes les sessions, envoie l\'email de confirmation', async () => {
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    const { service, mailService, authService } = buildService(fakePrisma);
    const before = Date.now();

    const result = await service.requestDeletion(user.id, { password: 'password123' });

    const scheduledMs = new Date(result.scheduledFor).getTime();
    expect(scheduledMs - before).toBeGreaterThan(47 * 60 * 60 * 1000);
    expect(scheduledMs - before).toBeLessThan(49 * 60 * 60 * 1000);
    expect(authService.revokeAllSessions).toHaveBeenCalledWith(user.id, undefined, true);
    expect(mailService.sendAccountDeletionRequested).toHaveBeenCalledTimes(1);
  });

  it('est idempotent : une 2e demande alors qu\'une PENDING existe déjà ne crée pas de doublon', async () => {
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    const { service, mailService } = buildService(fakePrisma);

    await service.requestDeletion(user.id, { password: 'password123' });
    await service.requestDeletion(user.id, { password: 'password123' });

    expect(fakePrisma.deletionRequests.size).toBe(1);
    expect(mailService.sendAccountDeletionRequested).toHaveBeenCalledTimes(1);
  });
});

describe('AccountDeletionService.cancelDeletion / getStatus', () => {
  it('annule une demande PENDING', async () => {
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    const { service } = buildService(fakePrisma);
    await service.requestDeletion(user.id, { password: 'password123' });

    const result = await service.cancelDeletion(user.id);

    expect(result.status).toBe('CANCELLED');
  });

  it('rejette si aucune demande PENDING n\'existe', async () => {
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    const { service } = buildService(fakePrisma);

    await expect(service.cancelDeletion(user.id)).rejects.toThrow(NotFoundException);
  });

  it('getStatus renvoie NONE si aucune demande n\'a jamais existé', async () => {
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    const { service } = buildService(fakePrisma);

    const result = await service.getStatus(user.id);

    expect(result).toEqual({ status: 'NONE' });
  });
});

describe('AccountDeletionService.executeScheduledDeletions — AUCUNE anonymisation', () => {
  it("exécute uniquement les demandes PENDING dont scheduledFor est passé, pose deletionExecutedAt, ne touche rien d'autre sur User", async () => {
    const user = makeUser({ name: 'Nom Original', email: 'original@example.com' });
    const fakePrisma = buildFakePrisma(user);
    fakePrisma.deletionRequests.set('req-due', {
      id: 'req-due',
      userId: user.id,
      status: 'PENDING',
      scheduledFor: new Date(Date.now() - 1000),
      requestedAt: new Date(),
      cancelledAt: null,
      executedAt: null,
    });
    fakePrisma.deletionRequests.set('req-future', {
      id: 'req-future',
      userId: 'user-2',
      status: 'PENDING',
      scheduledFor: new Date(Date.now() + 1000 * 60 * 60),
      requestedAt: new Date(),
      cancelledAt: null,
      executedAt: null,
    });
    const { service } = buildService(fakePrisma);

    const result = await service.executeScheduledDeletions();

    expect(result.executed).toBe(1);
    expect(fakePrisma.deletionRequests.get('req-due').status).toBe('EXECUTED');
    expect(fakePrisma.deletionRequests.get('req-future').status).toBe('PENDING'); // pas encore dû
    expect(user.deletionExecutedAt).toBeInstanceOf(Date);
    // Rien d'autre n'est anonymisé : nom/email identiques.
    expect(user.name).toBe('Nom Original');
    expect(user.email).toBe('original@example.com');
  });

  it('ne fait rien si aucune demande n\'est due', async () => {
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    const { service } = buildService(fakePrisma);

    const result = await service.executeScheduledDeletions();

    expect(result.executed).toBe(0);
  });
});

describe('AccountDeletionService.runScheduledExecutionCron — gates (staging + flag)', () => {
  const ORIGINAL_ENV = { ...process.env };
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('ne fait rien en staging, même si le flag est activé', async () => {
    process.env.APP_ENV = 'staging';
    process.env.ACCOUNT_DELETION_EXECUTION_ENABLED = 'true';
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    fakePrisma.deletionRequests.set('req-due', {
      id: 'req-due',
      userId: user.id,
      status: 'PENDING',
      scheduledFor: new Date(Date.now() - 1000),
      requestedAt: new Date(),
      cancelledAt: null,
      executedAt: null,
    });
    const { service } = buildService(fakePrisma);

    await service.runScheduledExecutionCron();

    expect(fakePrisma.deletionRequests.get('req-due').status).toBe('PENDING');
  });

  it('ne fait rien hors staging si le flag n\'est pas "true" (défaut)', async () => {
    delete process.env.APP_ENV;
    delete process.env.ACCOUNT_DELETION_EXECUTION_ENABLED;
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    fakePrisma.deletionRequests.set('req-due', {
      id: 'req-due',
      userId: user.id,
      status: 'PENDING',
      scheduledFor: new Date(Date.now() - 1000),
      requestedAt: new Date(),
      cancelledAt: null,
      executedAt: null,
    });
    const { service } = buildService(fakePrisma);

    await service.runScheduledExecutionCron();

    expect(fakePrisma.deletionRequests.get('req-due').status).toBe('PENDING');
  });

  it('exécute hors staging si le flag est explicitement "true"', async () => {
    delete process.env.APP_ENV;
    process.env.ACCOUNT_DELETION_EXECUTION_ENABLED = 'true';
    const user = makeUser();
    const fakePrisma = buildFakePrisma(user);
    fakePrisma.deletionRequests.set('req-due', {
      id: 'req-due',
      userId: user.id,
      status: 'PENDING',
      scheduledFor: new Date(Date.now() - 1000),
      requestedAt: new Date(),
      cancelledAt: null,
      executedAt: null,
    });
    const { service } = buildService(fakePrisma);

    await service.runScheduledExecutionCron();

    expect(fakePrisma.deletionRequests.get('req-due').status).toBe('EXECUTED');
  });
});
