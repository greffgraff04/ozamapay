import { BazikService, verifyBazikWebhookSignature } from './bazik.service';
import { createHmac } from 'crypto';

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_FETCH = global.fetch;

// OZAMAPAY_MASTER_ID is read into a module-level const the moment
// bazik.service.ts (via its @prisma/client import) is first required —
// before this file's beforeEach ever runs — so overriding process.env here
// would have no effect on it. Capture whatever value is already loaded
// (from backend/.env, same dotenv side effect @prisma/client triggers
// elsewhere in this codebase — see payments.service.staging.spec.ts) and use
// that as the master wallet's key in the fakes below. Never logged/printed.
const REAL_MASTER_ID = process.env.OZAMAPAY_MASTER_ID as string;

beforeEach(() => {
  process.env = {
    ...ORIGINAL_ENV,
    BAZIK_USER_ID: 'bzk_sandbox_test',
    BAZIK_SECRET_KEY: 'sk_sandbox_test',
    BAZIK_CLIENT_FEE_RATE: '0.06',
  };
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  global.fetch = ORIGINAL_FETCH;
  jest.clearAllMocks();
});

// ── In-memory Prisma fake — mirrors the exact calls bazik.service.ts makes ──
function buildFakePrisma() {
  const wallets = new Map<string, any>();
  const walletsByUser = new Map<string, string>();
  const transactions = new Map<string, any>();
  const users = new Map<string, any>();
  const ledgerEntries: any[] = [];
  let txCounter = 0;

  function findWallet(where: any) {
    if (where.id) return wallets.get(where.id) ?? null;
    if (where.userId) return wallets.get(walletsByUser.get(where.userId) as string) ?? null;
    return null;
  }

  function applyBalance(wallet: any, data: any) {
    if (data?.balance && typeof data.balance === 'object' && 'increment' in data.balance) {
      wallet.balance = Number(wallet.balance) + data.balance.increment;
    } else if (data?.balance !== undefined) {
      wallet.balance = data.balance;
    }
    return wallet;
  }

  function makeTxClient() {
    return {
      wallet: {
        findUnique: jest.fn(async ({ where }: any) => findWallet(where)),
        findFirst: jest.fn(async ({ where }: any) => findWallet(where)),
        update: jest.fn(async ({ where, data }: any) => applyBalance(findWallet(where), data)),
      },
      transaction: {
        update: jest.fn(async ({ where, data }: any) => {
          const t = transactions.get(where.id);
          Object.assign(t, data);
          return t;
        }),
      },
      ledgerEntry: {
        create: jest.fn(async ({ data }: any) => {
          ledgerEntries.push(data);
          return { id: `ledger-${ledgerEntries.length}`, ...data };
        }),
      },
    };
  }

  return {
    wallets,
    walletsByUser,
    transactions,
    users,
    ledgerEntries,
    user: {
      findUnique: jest.fn(async ({ where }: any) => users.get(where.id) ?? null),
    },
    wallet: {
      findUnique: jest.fn(async ({ where }: any) => findWallet(where)),
      findFirst: jest.fn(async ({ where }: any) => findWallet(where)),
    },
    transaction: {
      findFirst: jest.fn(async ({ where, include }: any) => {
        const found = Array.from(transactions.values()).find((t) => {
          if (where.receiverWalletId && t.receiverWalletId !== where.receiverWalletId) return false;
          if (where.reference && t.reference !== where.reference) return false;
          if (where.method && t.method !== where.method) return false;
          if (where.status && t.status !== where.status) return false;
          if (where.type && t.type !== where.type) return false;
          return true;
        });
        if (!found) return null;
        return include?.receiverWallet ? { ...found, receiverWallet: findWallet({ id: found.receiverWalletId }) } : found;
      }),
      findUnique: jest.fn(async ({ where, include }: any) => {
        const t = transactions.get(where.id);
        if (!t) return null;
        return include?.receiverWallet ? { ...t, receiverWallet: findWallet({ id: t.receiverWalletId }) } : t;
      }),
      findMany: jest.fn(async ({ where }: any) =>
        Array.from(transactions.values()).filter((t) => {
          if (where.type && t.type !== where.type) return false;
          if (where.status && t.status !== where.status) return false;
          if (where.method && t.method !== where.method) return false;
          if (where.createdAt?.lte && !(t.createdAt <= where.createdAt.lte)) return false;
          return true;
        }),
      ),
      create: jest.fn(async ({ data }: any) => {
        txCounter += 1;
        const row = { id: `tx-${txCounter}`, status: 'PENDING', fee: 0, createdAt: new Date(), ...data };
        transactions.set(row.id, row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const t = transactions.get(where.id);
        Object.assign(t, data);
        return t;
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        const t = transactions.get(where.id);
        if (t && (!where.status || t.status === where.status)) {
          Object.assign(t, data);
          return { count: 1 };
        }
        return { count: 0 };
      }),
    },
    $transaction: jest.fn(async (cb: any) => cb(makeTxClient())),
  };
}

function buildMailService() {
  return { sendTopupConfirmed: jest.fn().mockResolvedValue(undefined) };
}

function mockFetchRouter(overrides: { tokenStatus?: string; orderStatus?: string } = {}) {
  const fetchMock = jest.fn(async (url: string, _opts?: any) => {
    if (url.includes('/moncash/token')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ orderId: 'BZK_sandbox_abc123', redirectUrl: 'https://sandbox.moncashbutton.digicelgroup.com/pay/abc', status: 'pending' }),
      };
    }
    if (url.endsWith('/token')) {
      return { ok: true, status: 200, json: async () => ({ access_token: 'fake-token', expires_in: 86400 }) };
    }
    if (url.includes('/order/')) {
      return { ok: true, status: 200, json: async () => ({ status: overrides.orderStatus ?? 'pending' }) };
    }
    throw new Error(`unexpected fetch url in test: ${url}`);
  });
  global.fetch = fetchMock as any;
  return fetchMock;
}

describe('BazikService', () => {
  it('createPaymentRequest: creates a PENDING TOPUP transaction with the configured fee rate and returns the redirect URL', async () => {
    const prisma = buildFakePrisma();
    prisma.wallets.set('wallet-1', { id: 'wallet-1', balance: 1000 });
    prisma.walletsByUser.set('user-1', 'wallet-1');
    prisma.users.set('user-1', { id: 'user-1', email: 'client@example.com', name: 'Client Test' });
    const fetchMock = mockFetchRouter();

    const service = new BazikService(prisma as any, buildMailService() as any);
    const result = await service.createPaymentRequest('user-1', 1000);

    expect(result.paymentUrl).toContain('moncashbutton.digicelgroup.com');
    expect(result.referenceId).toBe('BZK_sandbox_abc123');

    const tx = Array.from(prisma.transactions.values())[0];
    expect(tx.status).toBe('PENDING');
    expect(tx.method).toBe('Bazik');
    expect(Number(tx.fee)).toBeCloseTo(60); // 6% of 1000
    expect(Number(tx.netAmount)).toBeCloseTo(940);
    expect(fetchMock).toHaveBeenCalledTimes(2); // /token then /moncash/token
  });

  it('createPaymentRequest: idempotent — a recent PENDING order for the same user returns the existing link without calling Bazik again', async () => {
    const prisma = buildFakePrisma();
    prisma.wallets.set('wallet-1', { id: 'wallet-1', balance: 1000 });
    prisma.walletsByUser.set('user-1', 'wallet-1');
    prisma.users.set('user-1', { id: 'user-1', email: 'client@example.com', name: 'Client Test' });
    prisma.transactions.set('tx-existing', {
      id: 'tx-existing',
      receiverWalletId: 'wallet-1',
      type: 'TOPUP',
      status: 'PENDING',
      method: 'Bazik',
      reference: 'BZK_sandbox_existing',
      description: 'https://sandbox.moncashbutton.digicelgroup.com/pay/existing',
      createdAt: new Date(),
    });
    const fetchMock = mockFetchRouter();

    const service = new BazikService(prisma as any, buildMailService() as any);
    const result = await service.createPaymentRequest('user-1', 500);

    expect(result.referenceId).toBe('BZK_sandbox_existing');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('handleWebhookEvent: never trusts the webhook alone — re-checks GET /order/{orderId} and credits only when that confirms success', async () => {
    const prisma = buildFakePrisma();
    prisma.wallets.set('wallet-1', { id: 'wallet-1', balance: 1000 });
    prisma.wallets.set('wallet-master', { id: 'wallet-master', balance: 0 });
    prisma.walletsByUser.set('user-1', 'wallet-1');
    prisma.walletsByUser.set(REAL_MASTER_ID, 'wallet-master');
    prisma.users.set('user-1', { id: 'user-1', email: 'client@example.com', name: 'Client Test' });
    prisma.transactions.set('tx-1', {
      id: 'tx-1',
      receiverWalletId: 'wallet-1',
      type: 'TOPUP',
      status: 'PENDING',
      method: 'Bazik',
      reference: 'BZK_sandbox_abc123',
      amount: 1000,
      fee: 60,
      netAmount: 940,
      createdAt: new Date(),
    });
    mockFetchRouter({ orderStatus: 'successful' });

    const service = new BazikService(prisma as any, buildMailService() as any);
    await service.handleWebhookEvent('BZK_sandbox_abc123');

    const tx = prisma.transactions.get('tx-1');
    expect(tx.status).toBe('COMPLETED');
    expect(prisma.wallets.get('wallet-1').balance).toBe(1940); // 1000 + 940 net
    expect(prisma.wallets.get('wallet-master').balance).toBe(60); // fee
    expect(prisma.ledgerEntries).toHaveLength(2);
    expect(prisma.ledgerEntries[0]).toMatchObject({ type: 'CREDIT', amount: 940, balanceBefore: 1000, balanceAfter: 1940 });
    expect(prisma.ledgerEntries[1]).toMatchObject({ type: 'CREDIT', amount: 60, balanceBefore: 0, balanceAfter: 60 });
  });

  it('handleWebhookEvent: replayed webhook (already COMPLETED) is a no-op — does not credit twice', async () => {
    const prisma = buildFakePrisma();
    prisma.wallets.set('wallet-1', { id: 'wallet-1', balance: 1940 });
    prisma.walletsByUser.set('user-1', 'wallet-1');
    prisma.transactions.set('tx-1', {
      id: 'tx-1',
      receiverWalletId: 'wallet-1',
      type: 'TOPUP',
      status: 'COMPLETED', // already credited
      method: 'Bazik',
      reference: 'BZK_sandbox_abc123',
      amount: 1000,
      fee: 60,
      netAmount: 940,
      createdAt: new Date(),
    });
    const fetchMock = mockFetchRouter({ orderStatus: 'successful' });

    const service = new BazikService(prisma as any, buildMailService() as any);
    await service.handleWebhookEvent('BZK_sandbox_abc123');

    expect(prisma.wallets.get('wallet-1').balance).toBe(1940); // unchanged
    // reconcileOrder returns before ever checking order status when status !== PENDING
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('handleWebhookEvent: order still pending on GET /order — leaves the transaction PENDING (no credit, no cancel)', async () => {
    const prisma = buildFakePrisma();
    prisma.wallets.set('wallet-1', { id: 'wallet-1', balance: 1000 });
    prisma.walletsByUser.set('user-1', 'wallet-1');
    prisma.transactions.set('tx-1', {
      id: 'tx-1',
      receiverWalletId: 'wallet-1',
      type: 'TOPUP',
      status: 'PENDING',
      method: 'Bazik',
      reference: 'BZK_sandbox_abc123',
      amount: 1000,
      fee: 60,
      netAmount: 940,
      createdAt: new Date(),
    });
    mockFetchRouter({ orderStatus: 'pending' });

    const service = new BazikService(prisma as any, buildMailService() as any);
    await service.handleWebhookEvent('BZK_sandbox_abc123');

    expect(prisma.transactions.get('tx-1').status).toBe('PENDING');
    expect(prisma.wallets.get('wallet-1').balance).toBe(1000);
  });

  it('reconcilePendingPayments (cron): cancels a PENDING transaction past the 35-min expiry window when the order is still not paid', async () => {
    const prisma = buildFakePrisma();
    prisma.wallets.set('wallet-1', { id: 'wallet-1', balance: 1000 });
    prisma.walletsByUser.set('user-1', 'wallet-1');
    const old = new Date(Date.now() - 40 * 60 * 1000);
    prisma.transactions.set('tx-1', {
      id: 'tx-1',
      receiverWalletId: 'wallet-1',
      type: 'TOPUP',
      status: 'PENDING',
      method: 'Bazik',
      reference: 'BZK_sandbox_abc123',
      amount: 1000,
      fee: 60,
      netAmount: 940,
      createdAt: old,
    });
    mockFetchRouter({ orderStatus: 'pending' });

    const service = new BazikService(prisma as any, buildMailService() as any);
    await service.reconcilePendingPayments();

    expect(prisma.transactions.get('tx-1').status).toBe('CANCELLED');
  });

  it('reconcilePendingPayments (cron): leaves a PENDING transaction alone when it is stale (>5min) but not yet expired (<35min)', async () => {
    const prisma = buildFakePrisma();
    prisma.wallets.set('wallet-1', { id: 'wallet-1', balance: 1000 });
    prisma.walletsByUser.set('user-1', 'wallet-1');
    const midway = new Date(Date.now() - 10 * 60 * 1000);
    prisma.transactions.set('tx-1', {
      id: 'tx-1',
      receiverWalletId: 'wallet-1',
      type: 'TOPUP',
      status: 'PENDING',
      method: 'Bazik',
      reference: 'BZK_sandbox_abc123',
      amount: 1000,
      fee: 60,
      netAmount: 940,
      createdAt: midway,
    });
    mockFetchRouter({ orderStatus: 'pending' });

    const service = new BazikService(prisma as any, buildMailService() as any);
    await service.reconcilePendingPayments();

    expect(prisma.transactions.get('tx-1').status).toBe('PENDING');
  });

  it('reconcilePendingPayments (cron): recovers a missed webhook — credits a stale PENDING transaction once GET /order confirms success', async () => {
    const prisma = buildFakePrisma();
    prisma.wallets.set('wallet-1', { id: 'wallet-1', balance: 1000 });
    prisma.wallets.set('wallet-master', { id: 'wallet-master', balance: 0 });
    prisma.walletsByUser.set('user-1', 'wallet-1');
    prisma.walletsByUser.set(REAL_MASTER_ID, 'wallet-master');
    prisma.users.set('user-1', { id: 'user-1', email: 'client@example.com', name: 'Client Test' });
    const midway = new Date(Date.now() - 10 * 60 * 1000);
    prisma.transactions.set('tx-1', {
      id: 'tx-1',
      receiverWalletId: 'wallet-1',
      type: 'TOPUP',
      status: 'PENDING',
      method: 'Bazik',
      reference: 'BZK_sandbox_abc123',
      amount: 1000,
      fee: 60,
      netAmount: 940,
      createdAt: midway,
    });
    mockFetchRouter({ orderStatus: 'completed' });

    const service = new BazikService(prisma as any, buildMailService() as any);
    await service.reconcilePendingPayments();

    expect(prisma.transactions.get('tx-1').status).toBe('COMPLETED');
    expect(prisma.wallets.get('wallet-1').balance).toBe(1940);
  });
});

describe('verifyBazikWebhookSignature', () => {
  const secret = 'whsec_sandbox_test';
  const timestamp = '1700000000';
  const eventId = 'evt_123';
  const rawBody = Buffer.from(JSON.stringify({ type: 'payment.succeeded', orderId: 'BZK_sandbox_abc123' }));

  function sign(ts: string, id: string, body: Buffer, key: string): string {
    return createHmac('sha256', key).update(`${ts}.${id}.${body.toString('utf8')}`).digest('hex');
  }

  it('accepts a correctly computed signature', () => {
    const signature = sign(timestamp, eventId, rawBody, secret);
    expect(verifyBazikWebhookSignature(rawBody, signature, timestamp, eventId, secret)).toBe(true);
  });

  it('rejects a tampered body', () => {
    const signature = sign(timestamp, eventId, rawBody, secret);
    const tampered = Buffer.from(JSON.stringify({ type: 'payment.succeeded', orderId: 'BZK_sandbox_OTHER' }));
    expect(verifyBazikWebhookSignature(tampered, signature, timestamp, eventId, secret)).toBe(false);
  });

  it('rejects when the webhook secret is not configured', () => {
    const signature = sign(timestamp, eventId, rawBody, secret);
    expect(verifyBazikWebhookSignature(rawBody, signature, timestamp, eventId, undefined)).toBe(false);
  });

  it('rejects a malformed (non-hex) signature instead of throwing', () => {
    expect(verifyBazikWebhookSignature(rawBody, 'not-hex-garbage!!', timestamp, eventId, secret)).toBe(false);
  });
});
