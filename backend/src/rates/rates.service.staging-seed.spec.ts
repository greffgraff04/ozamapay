import { RatesService } from './rates.service';

// L7 — RatesService.onModuleInit() seme USD_HTG/EUR_HTG sou staging
// sèlman (staging pa gen `prisma db seed` nan buildCommand li, kontrèman
// ak prod). Menm patwon ak src/config/staging-crons.spec.ts : enstansye
// sèvis la manyèlman, kontwole APP_ENV dirèkteman.
const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

function setStaging(on: boolean) {
  if (on) process.env.APP_ENV = 'staging';
  else delete process.env.APP_ENV;
}

function buildService() {
  const rows = new Map<string, any>();
  const prisma: any = {
    rate: {
      findUnique: jest.fn(({ where }: any) => Promise.resolve(rows.get(where.key) ?? null)),
      create: jest.fn(({ data }: any) => {
        rows.set(data.key, data);
        return Promise.resolve(data);
      }),
    },
  };
  const service = new RatesService(prisma, {} as any, {} as any);
  return { service, prisma, rows };
}

describe('RatesService.onModuleInit — seed to chanj staging', () => {
  it('kreye USD_HTG ak EUR_HTG an staging si yo pa egziste', async () => {
    const { service, prisma, rows } = buildService();
    setStaging(true);

    await service.onModuleInit();

    expect(rows.get('USD_HTG')?.value).toBe(135);
    expect(rows.get('EUR_HTG')?.value).toBe(152);
    expect(prisma.rate.create).toHaveBeenCalledTimes(2);
  });

  it('pa ekraze yon valè ki deja egziste an staging', async () => {
    const { service, prisma, rows } = buildService();
    rows.set('USD_HTG', { key: 'USD_HTG', value: 999, currency: 'HTG' });
    setStaging(true);

    await service.onModuleInit();

    expect(rows.get('USD_HTG')?.value).toBe(999); // pa touche
    expect(rows.get('EUR_HTG')?.value).toBe(152); // kreye paske li manke
    expect(prisma.rate.create).toHaveBeenCalledTimes(1);
  });

  it('pa fè anyen si pa an staging (APP_ENV absan)', async () => {
    const { service, prisma } = buildService();
    setStaging(false);

    await service.onModuleInit();

    expect(prisma.rate.findUnique).not.toHaveBeenCalled();
    expect(prisma.rate.create).not.toHaveBeenCalled();
  });
});
