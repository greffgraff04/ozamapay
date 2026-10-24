import { BadRequestException } from '@nestjs/common';
import { WalletService } from './wallet.service';

// L7 — /wallet/convert ak /wallet/convert/quote. Tès sa yo verifye kat
// senaryo kritik pou sekirite lajan mande nan tach la : montan negatif,
// doub soumisyon (menm quoteId 2 fwa), balans ensifizan, ak devis ekspire.
function buildService() {
  const quotes = new Map<string, any>();
  const rates: Record<string, number> = { USD_HTG: 140, EUR_HTG: 150 };
  const state = {
    walletBalance: 1000,
    currencyBalances: new Map<string, number>(), // key = `${userId}:${currency}`
  };
  let quoteSeq = 0;

  const prisma: any = {
    rate: {
      findUnique: jest.fn(({ where }: any) => {
        const value = rates[where.key];
        return Promise.resolve(value !== undefined ? { key: where.key, value } : null);
      }),
    },
    conversionQuote: {
      create: jest.fn(({ data }: any) => {
        quoteSeq += 1;
        const id = `quote-${quoteSeq}`;
        const row = { id, consumedAt: null, ...data };
        quotes.set(id, row);
        return Promise.resolve(row);
      }),
      findUnique: jest.fn(({ where }: any) => Promise.resolve(quotes.get(where.id) ?? null)),
      updateMany: jest.fn(({ where, data }: any) => {
        const row = quotes.get(where.id);
        if (!row) return Promise.resolve({ count: 0 });
        if (where.userId !== undefined && row.userId !== where.userId) return Promise.resolve({ count: 0 });
        if (where.consumedAt === null && row.consumedAt !== null) return Promise.resolve({ count: 0 });
        if (where.expiresAt?.gt && !(row.expiresAt > where.expiresAt.gt)) return Promise.resolve({ count: 0 });
        Object.assign(row, data);
        return Promise.resolve({ count: 1 });
      }),
    },
    wallet: {
      findUnique: jest.fn(() => Promise.resolve({ id: 'wallet-1', userId: 'user-1', balance: state.walletBalance })),
      updateMany: jest.fn(({ where, data }: any) => {
        const gte = Number(where.balance?.gte ?? 0);
        if (state.walletBalance < gte) return Promise.resolve({ count: 0 });
        const dec = data.balance?.decrement;
        const inc = data.balance?.increment;
        if (dec !== undefined) state.walletBalance -= Number(dec);
        if (inc !== undefined) state.walletBalance += Number(inc);
        return Promise.resolve({ count: 1 });
      }),
      update: jest.fn(({ data }: any) => {
        const dec = data.balance?.decrement;
        const inc = data.balance?.increment;
        if (dec !== undefined) state.walletBalance -= Number(dec);
        if (inc !== undefined) state.walletBalance += Number(inc);
        return Promise.resolve({});
      }),
    },
    walletCurrencyBalance: {
      findUnique: jest.fn(({ where }: any) => {
        const { userId, currency } = where.userId_currency;
        const key = `${userId}:${currency}`;
        const balance = state.currencyBalances.get(key);
        return Promise.resolve(balance === undefined ? null : { userId, currency, balance });
      }),
      updateMany: jest.fn(({ where, data }: any) => {
        const key = `${where.userId}:${where.currency}`;
        const current = state.currencyBalances.get(key) ?? 0;
        const gte = Number(where.balance?.gte ?? 0);
        if (current < gte) return Promise.resolve({ count: 0 });
        const dec = data.balance?.decrement;
        if (dec !== undefined) state.currencyBalances.set(key, current - Number(dec));
        return Promise.resolve({ count: 1 });
      }),
      upsert: jest.fn(({ where, update, create }: any) => {
        const { userId, currency } = where.userId_currency;
        const key = `${userId}:${currency}`;
        const current = state.currencyBalances.get(key);
        if (current === undefined) {
          state.currencyBalances.set(key, Number(create.balance));
        } else {
          const inc = update.balance?.increment;
          state.currencyBalances.set(key, current + Number(inc ?? 0));
        }
        return Promise.resolve({});
      }),
    },
    transaction: { create: jest.fn().mockResolvedValue({ id: 'tx-1' }) },
    ledgerEntry: { create: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn((cb: any) => cb(prisma)),
  };

  const service = new WalletService(prisma, {} as any, {} as any);
  return { service, prisma, state, quotes };
}

describe('WalletService — /wallet/convert/quote', () => {
  it('rejte yon montan negatif', async () => {
    const { service } = buildService();
    await expect(service.getConversionQuote('user-1', 'HTG', 'USD', -100)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejte yon montan zewo', async () => {
    const { service } = buildService();
    await expect(service.getConversionQuote('user-1', 'HTG', 'USD', 0)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejte si from === to', async () => {
    const { service } = buildService();
    await expect(service.getConversionQuote('user-1', 'HTG', 'HTG', 100)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('kreye yon devis valid HTG -> USD, frè 1% wondi AN WO, montan final wondi AN BA', async () => {
    const { service } = buildService();
    const quote = await service.getConversionQuote('user-1', 'HTG', 'USD', 1400);
    expect(quote.quoteId).toBeDefined();
    // 1400/140 = 10 USD brit. Frè 1% = 0.10 (wondi an wo, deja egzak isit
    // la). Final = floor(10 - 0.10) = 9.90.
    expect(quote.feePercent).toBe(0.01);
    expect(quote.feeAmount).toBeCloseTo(0.1, 2);
    expect(quote.finalAmount).toBeCloseTo(9.9, 2);
  });

  it('frè wondi AN WO, pa janm anba 1% reyèl la (ekzanp ki pa tonbe wonn)', async () => {
    const { service } = buildService();
    // 777/140 = 5.55 brit. Frè 1% egzak = 0.0555 -> ceilCents = 0.06 (pa 0.05).
    const quote = await service.getConversionQuote('user-1', 'HTG', 'USD', 777);
    expect(quote.feeAmount).toBeCloseTo(0.06, 2);
    expect(quote.finalAmount).toBeCloseTo(5.49, 2); // floor(5.55 - 0.06)
  });
});

describe('WalletService — round-trip pa janm rann plis pase montan depa a', () => {
  const amounts = [7, 13.37, 100, 999];

  it.each(amounts)('HTG(%s) -> USD -> HTG pa janm depase montan depa a', async (amount) => {
    const { service, state } = buildService();
    state.walletBalance = amount;

    const q1 = await service.getConversionQuote('user-1', 'HTG', 'USD', amount);
    await service.executeConversion('user-1', q1.quoteId);
    const usdBalance = state.currencyBalances.get('user-1:USD') ?? 0;
    expect(usdBalance).toBeCloseTo(q1.finalAmount, 2);

    if (usdBalance > 0) {
      const q2 = await service.getConversionQuote('user-1', 'USD', 'HTG', usdBalance);
      await service.executeConversion('user-1', q2.quoteId);
    }

    expect(state.walletBalance).toBeLessThanOrEqual(amount);
  });

  it('round-trip ak 3 devise (HTG -> EUR -> USD -> HTG) pa janm genyen lajan', async () => {
    const { service, state } = buildService();
    const startAmount = 500;
    state.walletBalance = startAmount;

    const q1 = await service.getConversionQuote('user-1', 'HTG', 'EUR', startAmount);
    await service.executeConversion('user-1', q1.quoteId);
    const eur = state.currencyBalances.get('user-1:EUR') ?? 0;

    const q2 = await service.getConversionQuote('user-1', 'EUR', 'USD', eur);
    await service.executeConversion('user-1', q2.quoteId);
    const usd = state.currencyBalances.get('user-1:USD') ?? 0;

    const q3 = await service.getConversionQuote('user-1', 'USD', 'HTG', usd);
    await service.executeConversion('user-1', q3.quoteId);

    expect(state.walletBalance).toBeLessThanOrEqual(startAmount);
  });

  it('montan tèlman piti ke frè a ta manje tout valè a — rejte pwòpteman, pa kredite 0/negatif', async () => {
    const { service } = buildService();
    // 1 HTG / 140 = 0.0071 USD brit. ceilCents(frè) = 0.01 minimòm, pi plis
    // pase valè brit la — finalAmount ta negatif. Dwe rejte, pa kreye yon
    // devis ak yon montan ki pa gen sans.
    await expect(service.getConversionQuote('user-1', 'HTG', 'USD', 1)).rejects.toThrow(
      BadRequestException,
    );
  });
});

describe('WalletService — /wallet/convert (egzekisyon)', () => {
  it('debite wallet HTG epi kredite WalletCurrencyBalance USD (net frè 1%)', async () => {
    const { service, state } = buildService();
    const quote = await service.getConversionQuote('user-1', 'HTG', 'USD', 700); // wallet gen 1000 HTG
    const result = await service.executeConversion('user-1', quote.quoteId);

    expect(result.success).toBe(true);
    expect(state.walletBalance).toBe(300); // 1000 - 700 (debi pa touche pa frè a)
    // 700/140 = 5 brit. Frè 1% = 0.05 egzak. Final = floor(5 - 0.05) = 4.95.
    expect(state.currencyBalances.get('user-1:USD')).toBeCloseTo(4.95, 2);
  });

  it('doub soumisyon (menm quoteId 2 fwa) — dezyèm apèl la echwe', async () => {
    const { service } = buildService();
    const quote = await service.getConversionQuote('user-1', 'HTG', 'USD', 100);

    await service.executeConversion('user-1', quote.quoteId);
    await expect(service.executeConversion('user-1', quote.quoteId)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('montan pi gwo pase plafon sanite — rejte depi nan devis la', async () => {
    const { service } = buildService();
    await expect(service.getConversionQuote('user-1', 'HTG', 'USD', 999_999)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('balans ensifizan — montan anba plafon men pi gwo pase solde wallet la', async () => {
    const { service, state } = buildService();
    state.walletBalance = 50;
    const quote = await service.getConversionQuote('user-1', 'HTG', 'USD', 100);
    await expect(service.executeConversion('user-1', quote.quoteId)).rejects.toThrow(
      BadRequestException,
    );
    expect(state.walletBalance).toBe(50); // pa touche
  });

  it('devis ekspire — rejte egzekisyon', async () => {
    const { service, quotes } = buildService();
    const quote = await service.getConversionQuote('user-1', 'HTG', 'USD', 100);
    const row = quotes.get(quote.quoteId);
    row.expiresAt = new Date(Date.now() - 1000); // fòse ekspirasyon

    await expect(service.executeConversion('user-1', quote.quoteId)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('quoteId envalid/pa jwenn — rejte', async () => {
    const { service } = buildService();
    await expect(service.executeConversion('user-1', 'quote-pa-egziste')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('refize EUR si to EUR_HTG pa egziste', async () => {
    const { service, prisma } = buildService();
    prisma.rate.findUnique.mockImplementation(({ where }: any) =>
      where.key === 'EUR_HTG' ? Promise.resolve(null) : Promise.resolve({ key: where.key, value: 140 }),
    );
    await expect(service.getConversionQuote('user-1', 'HTG', 'EUR', 100)).rejects.toThrow(
      BadRequestException,
    );
  });
});
