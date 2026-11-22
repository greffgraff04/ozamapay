// ACTIVATION_THRESHOLD_ENABLED ak ACTIVATION_THRESHOLD_START_DATE li env a yon
// sèl fwa lè constants.ts chaje — jest.resetModules() + require() fre
// obligatwa nan chak tès pou yo pran nouvo valè yo.

const THRESHOLD_START = '2026-12-01T00:00:00.000Z';

function buildService(userOverrides: Partial<{
  createdAt: Date;
  kycStatus: string | null;
  balance: number;
}>) {
  const user = {
    createdAt: userOverrides.createdAt ?? new Date('2026-12-15T00:00:00.000Z'),
    kyc: userOverrides.kycStatus ? { status: userOverrides.kycStatus } : null,
    wallet: { balance: userOverrides.balance ?? 0 },
  };
  const prisma: any = {
    user: { findUnique: jest.fn().mockResolvedValue(user) },
  };
  const { ActivationService: FreshActivationService } = require('./activation.service');
  const service = new FreshActivationService(prisma);
  return { service, prisma, user };
}

describe('ActivationService — seuil d\'activation', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV, ACTIVATION_THRESHOLD_START_DATE: THRESHOLD_START };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('flag=false: ancien compte ou nouveau — jamais bloqué, même sous le seuil', async () => {
    process.env.ACTIVATION_THRESHOLD_ENABLED = 'false';
    const { service } = buildService({ createdAt: new Date('2026-12-15'), balance: 0 });

    await expect(service.assertActivated('user-1')).resolves.toBeUndefined();
  });

  it('flag=true, ancien compte (créé avant la date de bascule) — jamais concerné, jamais bloqué', async () => {
    process.env.ACTIVATION_THRESHOLD_ENABLED = 'true';
    const { service } = buildService({ createdAt: new Date('2026-11-01'), balance: 0 });

    await expect(service.assertActivated('user-1')).resolves.toBeUndefined();
  });

  it('flag=true, nouveau compte sous le seuil (1000 HTG < 1500) — bloqué', async () => {
    process.env.ACTIVATION_THRESHOLD_ENABLED = 'true';
    const { service } = buildService({ createdAt: new Date('2026-12-15'), balance: 1000 });

    await expect(service.assertActivated('user-1')).rejects.toThrow(/poko aktive/);
  });

  it('flag=true, nouveau compte au seuil exact (1500 HTG) — débloqué', async () => {
    process.env.ACTIVATION_THRESHOLD_ENABLED = 'true';
    const { service } = buildService({ createdAt: new Date('2026-12-15'), balance: 1500 });

    await expect(service.assertActivated('user-1')).resolves.toBeUndefined();
  });

  it('flag=true, nouveau compte au-dessus du seuil — débloqué', async () => {
    process.env.ACTIVATION_THRESHOLD_ENABLED = 'true';
    const { service } = buildService({ createdAt: new Date('2026-12-15'), balance: 3000 });

    await expect(service.assertActivated('user-1')).resolves.toBeUndefined();
  });

  it('flag=true, nouveau compte avec KYC APPROVED (dont Membre Fondateur) — jamais bloqué même sous le seuil', async () => {
    process.env.ACTIVATION_THRESHOLD_ENABLED = 'true';
    const { service } = buildService({ createdAt: new Date('2026-12-15'), kycStatus: 'APPROVED', balance: 0 });

    await expect(service.assertActivated('user-1')).resolves.toBeUndefined();
  });

  it('flag=true mais ACTIVATION_THRESHOLD_START_DATE absent — personne concerné (défaut sécurisé)', async () => {
    process.env.ACTIVATION_THRESHOLD_ENABLED = 'true';
    delete process.env.ACTIVATION_THRESHOLD_START_DATE;
    const { service } = buildService({ createdAt: new Date('2026-12-15'), balance: 0 });

    await expect(service.assertActivated('user-1')).resolves.toBeUndefined();
  });

  it('getStatus() renvoie missingHtg et grossDepositEstimateHtg corrects pour un compte bloqué', async () => {
    process.env.ACTIVATION_THRESHOLD_ENABLED = 'true';
    const { service } = buildService({ createdAt: new Date('2026-12-15'), balance: 1000 });

    const status = await service.getStatus('user-1');

    expect(status.isSubjectToThreshold).toBe(true);
    expect(status.isActivated).toBe(false);
    expect(status.currentBalanceHtg).toBe(1000);
    expect(status.missingHtg).toBe(500);
    expect(status.grossDepositEstimateHtg).toBe(Math.ceil(500 / 0.94));
  });

  it('getStatus() renvoie missingHtg=0 pour un compte non concerné', async () => {
    process.env.ACTIVATION_THRESHOLD_ENABLED = 'true';
    const { service } = buildService({ createdAt: new Date('2026-11-01'), balance: 0 });

    const status = await service.getStatus('user-1');

    expect(status.isSubjectToThreshold).toBe(false);
    expect(status.isActivated).toBe(true);
    expect(status.missingHtg).toBe(0);
  });
});
