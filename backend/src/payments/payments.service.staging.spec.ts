jest.mock('moncash-sdk', () => ({
  configure: jest.fn(),
  payment: { create: jest.fn(), redirect_uri: jest.fn() },
  capture: { getByTransactionId: jest.fn() },
}));

import { ServiceUnavailableException } from '@nestjs/common';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  jest.clearAllMocks();
  // Deliberately no jest.resetModules() — PaymentsService caches no
  // module-level state (env vars are read fresh in the constructor each
  // time), and resetting modules here would desync the `@nestjs/common`
  // instance a freshly re-required PaymentsService binds to from the one
  // imported at the top of this file, breaking `toBeInstanceOf` checks.
  // It would also re-trigger @prisma/client's dotenv side effect, which is
  // exactly what silently repopulated a deleted env var from backend/.env
  // the first time this file was written (see git history).
});

// Requiring payments.service.ts transitively requires @prisma/client, whose
// own dotenv side effect loads backend/.env into process.env on first
// import. Always require THEN apply this test's env overrides, never the
// other way around, or a deleted var comes back from .env underneath you.
function freshService(env: Record<string, string | undefined>) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PaymentsService } = require('./payments.service');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const moncash = require('moncash-sdk');
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  return { PaymentsService, moncash };
}

describe('PaymentsService (native MonCash) — staging guard, prod unchanged', () => {
  it('prod-identical: constructor still throws when MONCASH_MODE is unset and APP_ENV is unset', () => {
    const { PaymentsService } = freshService({
      APP_ENV: undefined,
      MONCASH_MODE: undefined,
      MONCASH_CLIENT_ID: undefined,
      MONCASH_SECRET_KEY: undefined,
    });
    expect(() => new PaymentsService({} as any)).toThrow(/MONCASH_MODE/);
  });

  it('prod-identical: constructor still throws when MONCASH_MODE is unset and APP_ENV=production', () => {
    const { PaymentsService } = freshService({
      APP_ENV: 'production',
      MONCASH_MODE: undefined,
      MONCASH_CLIENT_ID: undefined,
      MONCASH_SECRET_KEY: undefined,
    });
    expect(() => new PaymentsService({} as any)).toThrow(/MONCASH_MODE/);
  });

  it('prod-identical: configure() still called when MONCASH_MODE is set and APP_ENV is unset', () => {
    const { PaymentsService, moncash } = freshService({
      APP_ENV: undefined,
      MONCASH_MODE: 'live',
      MONCASH_CLIENT_ID: 'id',
      MONCASH_SECRET_KEY: 'secret',
    });
    expect(() => new PaymentsService({} as any)).not.toThrow();
    expect(moncash.configure).toHaveBeenCalledTimes(1);
  });

  it('staging: does NOT throw at construction when MONCASH_MODE is unset (no boot crash)', () => {
    const { PaymentsService, moncash } = freshService({
      APP_ENV: 'staging',
      MONCASH_MODE: undefined,
      MONCASH_CLIENT_ID: undefined,
      MONCASH_SECRET_KEY: undefined,
    });
    expect(() => new PaymentsService({} as any)).not.toThrow();
    expect(moncash.configure).not.toHaveBeenCalled();
  });

  it('staging: createMonCashPayment/validateMonCashPayment reject with 503 when MONCASH_MODE is unset', async () => {
    const { PaymentsService } = freshService({
      APP_ENV: 'staging',
      MONCASH_MODE: undefined,
      MONCASH_CLIENT_ID: undefined,
      MONCASH_SECRET_KEY: undefined,
    });
    const service = new PaymentsService({} as any);
    await expect(service.createMonCashPayment(100, 'user-1')).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(service.validateMonCashPayment('tx-1')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('staging: stays disabled (503, no configure) when MONCASH_MODE=live even with credentials', async () => {
    const { PaymentsService, moncash } = freshService({
      APP_ENV: 'staging',
      MONCASH_MODE: 'live',
      MONCASH_CLIENT_ID: 'id',
      MONCASH_SECRET_KEY: 'secret',
    });
    const service = new PaymentsService({} as any);
    expect(moncash.configure).not.toHaveBeenCalled();
    await expect(service.createMonCashPayment(100, 'user-1')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('staging: stays disabled when MONCASH_MODE=sandbox but credentials are missing', async () => {
    const { PaymentsService, moncash } = freshService({
      APP_ENV: 'staging',
      MONCASH_MODE: 'sandbox',
      MONCASH_CLIENT_ID: undefined,
      MONCASH_SECRET_KEY: undefined,
    });
    const service = new PaymentsService({} as any);
    expect(moncash.configure).not.toHaveBeenCalled();
    await expect(service.createMonCashPayment(100, 'user-1')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('staging: enabled (configure called, no 503) when MONCASH_MODE=sandbox with both credentials', async () => {
    const { PaymentsService, moncash } = freshService({
      APP_ENV: 'staging',
      MONCASH_MODE: 'sandbox',
      MONCASH_CLIENT_ID: 'sandbox-id',
      MONCASH_SECRET_KEY: 'sandbox-secret',
    });
    const service = new PaymentsService({} as any);
    expect(moncash.configure).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'sandbox', client_id: 'sandbox-id', client_secret: 'sandbox-secret' }),
    );

    // Should reach the real SDK call path (not short-circuit to 503) — the
    // sdk mock's create() never invokes its callback, so this only needs to
    // not reject synchronously with ServiceUnavailableException.
    const result = service.createMonCashPayment(100, 'user-1');
    await expect(Promise.race([result, Promise.resolve('pending')])).resolves.not.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
