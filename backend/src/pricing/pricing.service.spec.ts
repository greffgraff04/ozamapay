// RENAISSANCE_PRICING_ENABLED li env a yon sèl fwa lè constants.ts chaje —
// jest.resetModules() + require() fre obligatwa pou chak tès.

const DEFAULT_ACTIVATION_STATUS = {
  activationThresholdEnabled: false,
  thresholdHtg: 1500,
  isSubjectToThreshold: false,
  currentBalanceHtg: 0,
  isActivated: true,
  missingHtg: 0,
  grossDepositEstimateHtg: 0,
};

function buildService(opts: { anyCardEver?: any; wallet?: any; paidOldKycTx?: any }) {
  const prisma: any = {
    virtualCard: { findFirst: jest.fn().mockResolvedValue(opts.anyCardEver ?? null) },
    wallet: { findUnique: jest.fn().mockResolvedValue(opts.wallet ?? { id: 'wallet-1', userId: 'user-1' }) },
    transaction: { findFirst: jest.fn().mockResolvedValue(opts.paidOldKycTx ?? null) },
  };
  const activationService: any = {
    getStatus: jest.fn().mockResolvedValue(DEFAULT_ACTIVATION_STATUS),
  };
  const { PricingService: FreshPricingService } = require('./pricing.service');
  const service = new FreshPricingService(prisma, activationService);
  return { service, prisma, activationService };
}

describe('PricingService.getPricing — Renaissance pricing', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('flag=false: pri ansyen an, isFounderFreeCard toujou false', async () => {
    process.env.RENAISSANCE_PRICING_ENABLED = 'false';
    const { service } = buildService({});

    const result = await service.getPricing('user-1');

    expect(result).toEqual({
      renaissancePricingEnabled: false,
      kycFeeHtg: 3375,
      kycFeeUsd: 25,
      cardCreationFeeHtg: 0,
      cardInitialBalanceUsd: null,
      isFounderFreeCard: false,
      ...DEFAULT_ACTIVATION_STATUS,
    });
  });

  it('flag=true, san userId: kyc gratis, frè kat 1500 HTG, isFounderFreeCard false', async () => {
    process.env.RENAISSANCE_PRICING_ENABLED = 'true';
    const { service } = buildService({});

    const result = await service.getPricing();

    expect(result.kycFeeHtg).toBe(0);
    expect(result.cardCreationFeeHtg).toBe(1500);
    expect(result.cardInitialBalanceUsd).toBe(3);
    expect(result.isFounderFreeCard).toBe(false);
  });

  it('flag=true, itilizatè manm fondatè (ansyen KYC peye + zewo kat): isFounderFreeCard true, frè kat 0', async () => {
    process.env.RENAISSANCE_PRICING_ENABLED = 'true';
    const { service } = buildService({ anyCardEver: null, paidOldKycTx: { id: 'kyc-tx-1' } });

    const result = await service.getPricing('user-1');

    expect(result.isFounderFreeCard).toBe(true);
    expect(result.cardCreationFeeHtg).toBe(0);
  });

  it('flag=true, itilizatè ki gen deja yon kat: isFounderFreeCard false menm si li te peye ansyen KYC', async () => {
    process.env.RENAISSANCE_PRICING_ENABLED = 'true';
    const { service } = buildService({ anyCardEver: { id: 'old-card' }, paidOldKycTx: { id: 'kyc-tx-1' } });

    const result = await service.getPricing('user-1');

    expect(result.isFounderFreeCard).toBe(false);
    expect(result.cardCreationFeeHtg).toBe(1500);
  });
});
