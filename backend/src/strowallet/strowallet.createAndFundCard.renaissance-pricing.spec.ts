// Swit backend pou nouvo pri (RENAISSANCE_PRICING_ENABLED) nan
// createAndFundCard(): frè 1500 HTG, kat gratis manm fondatè, ak komisyon
// agent FIRST_CARD. RENAISSANCE_PRICING_ENABLED li env a yon sèl fwa lè
// constants.ts chaje — jest.resetModules() + require() fre nan chak tès
// obligatwa pou flag la pran nouvo valè a (wè buildServiceWith() pi ba).

describe('StrowalletService.createAndFundCard — Renaissance pricing', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV, OZAMAPAY_MASTER_ID: 'master-user-id' };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('flag=false: konpòtman ansyen an rete EGZAKTEMAN menm jan (pa gen frè fiks, pa gen komisyon FIRST_CARD)', async () => {
    process.env.RENAISSANCE_PRICING_ENABLED = 'false';
    const { StrowalletService: FreshService } = require('./strowallet.service');
    const { service, prisma } = ((): any => {
      const wallet = { id: 'wallet-1', balance: 1_000_000 };
      const user = {
        id: 'user-1', email: 'c@e.com', name: 'Jan Pyè', phone: '50912345678', referredByAgentId: 'agent-1', wallet,
        kyc: { status: 'APPROVED', phoneNumber: '50912345678', firstName: 'Jan', lastName: 'Pyè', dateOfBirth: new Date('1990-01-01'), idNumber: 'ID1', idImage: 'https://x/y.jpg', line1: '123 Rue Delmas 33', city: 'PAP', state: 'Ouest', zipCode: '1234', country: 'Haiti' },
      };
      const prisma: any = {
        virtualCard: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockImplementation(async ({ data }: any) => ({ id: 'vc-1', ...data })), update: jest.fn() },
        user: { findUnique: jest.fn().mockResolvedValue(user) },
        transaction: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockImplementation(async ({ data }: any) => ({ id: `tx-${Math.random()}`, ...data })) },
        wallet: { findUnique: jest.fn().mockResolvedValue(wallet), update: jest.fn().mockResolvedValue({}) },
        ledgerEntry: { create: jest.fn().mockResolvedValue({}) },
        agent: { findUnique: jest.fn().mockResolvedValue({ id: 'agent-1', wallet: { agentId: 'agent-1' } }), update: jest.fn().mockResolvedValue({}) },
        agentWallet: { update: jest.fn().mockResolvedValue({}) },
        commission: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({}) },
        rate: { findUnique: jest.fn().mockResolvedValue({ value: 135 }) },
        $transaction: jest.fn((cb: any) => cb(prisma)),
      };
      const service = new FreshService(prisma, { get: jest.fn() }, {}, {}, {}, { assertActivated: jest.fn().mockResolvedValue(undefined) });
      jest.spyOn(service as any, 'nfcPost').mockImplementation(async (endpoint: any) => {
        if (endpoint === 'cardkyc') return { response: { customer_id: 'cust-1', status: 'approved' } };
        return { response: { card_id: 'card-1' } };
      });
      jest.spyOn(service as any, 'resolveIdFrontImageBase64').mockResolvedValue('base64img');
      return { service, prisma };
    })();

    const result = await service.createAndFundCard('user-1', 10);

    expect(result.card).toBeDefined();
    // Ansyen konpòtman: yon sèl Transaction CARD pou totalHtg = 10 * 135 = 1350 HTG, pa gen frè fiks separe.
    expect(prisma.transaction.create).toHaveBeenCalledTimes(1);
    expect(prisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ amount: 1350, description: expect.stringContaining('$10') }) }),
    );
    expect(prisma.commission.create).not.toHaveBeenCalled();
    expect(prisma.ledgerEntry.create).not.toHaveBeenCalled();
  });

  it('flag=true, pa manm fondatè, san rechaj ($3): peye 1500 HTG sèlman, kat gen $3', async () => {
    process.env.RENAISSANCE_PRICING_ENABLED = 'true';
    const { StrowalletService: FreshService } = require('./strowallet.service');
    const { service, prisma } = buildServiceWith(FreshService, { anyCardEver: null });

    const result = await service.createAndFundCard('user-1', 3);

    expect(result.card.balance).toBe(3);
    const feeTxCall = prisma.transaction.create.mock.calls.find((c: any) => c[0].data.title === 'Frè kreyasyon kat');
    expect(feeTxCall[0].data.amount).toBe(1500);
    const topUpTxCall = prisma.transaction.create.mock.calls.find((c: any) => c[0].data.title === 'Rechaj kat lè kreyasyon');
    expect(topUpTxCall).toBeUndefined();
  });

  it('flag=true, pa manm fondatè, ak rechaj ($10 total): peye 1500 HTG + (10-3)*135 HTG', async () => {
    process.env.RENAISSANCE_PRICING_ENABLED = 'true';
    const { StrowalletService: FreshService } = require('./strowallet.service');
    const { service, prisma } = buildServiceWith(FreshService, { anyCardEver: null });

    const result = await service.createAndFundCard('user-1', 10);

    expect(result.card.balance).toBe(10);
    const feeTxCall = prisma.transaction.create.mock.calls.find((c: any) => c[0].data.title === 'Frè kreyasyon kat');
    expect(feeTxCall[0].data.amount).toBe(1500);
    const topUpTxCall = prisma.transaction.create.mock.calls.find((c: any) => c[0].data.title === 'Rechaj kat lè kreyasyon');
    expect(topUpTxCall[0].data.amount).toBe(Math.ceil(7 * 135));
  });

  it('flag=true, manm fondatè (ansyen KYC peye + zewo kat): kat gratis $3, pa gen debi kliyan, OZAMAPAY peye', async () => {
    process.env.RENAISSANCE_PRICING_ENABLED = 'true';
    const { StrowalletService: FreshService } = require('./strowallet.service');
    const { service, prisma } = buildServiceWith(FreshService, {
      anyCardEver: null,
      paidOldKycTx: { id: 'kyc-tx-1', title: 'Frè KYC' },
    });

    const result = await service.createAndFundCard('user-1', 50); // montan mande a inyore

    expect(result.card.balance).toBe(3);
    expect(result.card.isFounderFreeCard).toBe(true);
    const feeTxCall = prisma.transaction.create.mock.calls.find((c: any) => c[0].data.title === 'Frè kreyasyon kat');
    expect(feeTxCall).toBeUndefined();
    const giftTxCall = prisma.transaction.create.mock.calls.find((c: any) => c[0].data.title === 'Kat gratis manm fondatè');
    expect(giftTxCall).toBeDefined();
    expect(giftTxCall[0].data.senderWalletId).toBe('master-wallet');
    // Pa gen komisyon pou kat gratis manm fondatè a.
    expect(prisma.commission.create).not.toHaveBeenCalled();
  });

  it('flag=true, kliyan ki gen deja yon kat (nenpòt estati) pa elijib pou manm fondatè, menm si li te peye ansyen KYC', async () => {
    process.env.RENAISSANCE_PRICING_ENABLED = 'true';
    const { StrowalletService: FreshService } = require('./strowallet.service');
    const { service, prisma } = buildServiceWith(FreshService, {
      anyCardEver: { id: 'old-card', status: 'TERMINATED' },
      paidOldKycTx: { id: 'kyc-tx-1', title: 'Frè KYC' },
    });

    const result = await service.createAndFundCard('user-1', 3);

    expect(result.card.isFounderFreeCard).toBe(false);
    const feeTxCall = prisma.transaction.create.mock.calls.find((c: any) => c[0].data.title === 'Frè kreyasyon kat');
    expect(feeTxCall[0].data.amount).toBe(1500);
  });

  it('flag=true: komisyon 200 HTG peye a agent referan pou premye kat PEYAN', async () => {
    process.env.RENAISSANCE_PRICING_ENABLED = 'true';
    const { StrowalletService: FreshService } = require('./strowallet.service');
    const { service, prisma } = buildServiceWith(FreshService, {
      anyCardEver: null,
      referredByAgentId: 'agent-1',
      alreadyPaidFirstCardCommission: false,
    });

    await service.createAndFundCard('user-1', 3);

    expect(prisma.agentWallet.update).toHaveBeenCalledWith({ where: { agentId: 'agent-1' }, data: { balance: { increment: 200 } } });
    expect(prisma.commission.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ agentId: 'agent-1', userId: 'user-1', amount: 200, type: 'FIRST_CARD' }) }),
    );
  });

  it('flag=true: PA peye 2 fwa komisyon FIRST_CARD pou menm kliyan (gad anti-doublon)', async () => {
    process.env.RENAISSANCE_PRICING_ENABLED = 'true';
    const { StrowalletService: FreshService } = require('./strowallet.service');
    const { service, prisma } = buildServiceWith(FreshService, {
      anyCardEver: null,
      referredByAgentId: 'agent-1',
      alreadyPaidFirstCardCommission: true,
    });

    await service.createAndFundCard('user-1', 3);

    expect(prisma.agentWallet.update).not.toHaveBeenCalled();
    expect(prisma.commission.create).not.toHaveBeenCalled();
  });

  it('flag=true: pa gen komisyon pou kat gratis manm fondatè a menm si gen agent referan', async () => {
    process.env.RENAISSANCE_PRICING_ENABLED = 'true';
    const { StrowalletService: FreshService } = require('./strowallet.service');
    const { service, prisma } = buildServiceWith(FreshService, {
      anyCardEver: null,
      paidOldKycTx: { id: 'kyc-tx-1', title: 'Frè KYC' },
      referredByAgentId: 'agent-1',
    });

    await service.createAndFundCard('user-1', 3);

    expect(prisma.commission.create).not.toHaveBeenCalled();
    expect(prisma.agentWallet.update).not.toHaveBeenCalled();
  });

  it('flag=true: si founisè a echwe, wallet kliyan ranbouse entegralman (0 HTG debite pou manm fondatè, otreman totalHtg)', async () => {
    process.env.RENAISSANCE_PRICING_ENABLED = 'true';
    const { StrowalletService: FreshService } = require('./strowallet.service');
    const { service, prisma } = buildServiceWith(FreshService, { anyCardEver: null });
    (service as any).nfcPost.mockRejectedValueOnce(new Error('provider down'));

    await expect(service.createAndFundCard('user-1', 3)).rejects.toThrow();

    const refundCall = prisma.wallet.update.mock.calls.find((c: any) => c[0].data?.balance?.increment);
    expect(refundCall[0].data.balance.increment).toBe(1500);
  });
});

function buildServiceWith(
  FreshService: any,
  opts: {
    anyCardEver?: any;
    paidOldKycTx?: any;
    referredByAgentId?: string | null;
    alreadyPaidFirstCardCommission?: boolean;
  },
) {
  const wallet = { id: 'wallet-1', balance: 1_000_000 };
  const masterWallet = { id: 'master-wallet', balance: 5_000_000 };
  const user = {
    id: 'user-1',
    email: 'client@example.com',
    name: 'Jan Pyè',
    phone: '50912345678',
    referredByAgentId: opts.referredByAgentId ?? null,
    wallet,
    kyc: {
      status: 'APPROVED',
      phoneNumber: '50912345678',
      firstName: 'Jan',
      lastName: 'Pyè',
      dateOfBirth: new Date('1990-01-01'),
      idNumber: 'ID123456',
      idImage: 'https://example.com/id.jpg',
      line1: '123 Rue Delmas 33',
      city: 'Port-au-Prince',
      state: 'Ouest',
      zipCode: 'HT1234',
      country: 'Haiti',
    },
  };

  const prisma: any = {
    virtualCard: {
      findFirst: jest.fn(({ where }: any) => {
        if (where.status) return Promise.resolve(null);
        return Promise.resolve(opts.anyCardEver ?? null);
      }),
      create: jest.fn().mockImplementation(async ({ data }: any) => ({ id: 'virtualcard-db-1', ...data })),
      update: jest.fn().mockResolvedValue({}),
    },
    user: { findUnique: jest.fn().mockResolvedValue(user) },
    transaction: {
      findFirst: jest.fn().mockResolvedValue(opts.paidOldKycTx ?? null),
      create: jest.fn().mockImplementation(async ({ data }: any) => ({ id: `tx-${Math.random()}`, ...data })),
    },
    wallet: {
      findUnique: jest.fn(({ where }: any) => {
        if (where.userId === process.env.OZAMAPAY_MASTER_ID) return Promise.resolve(masterWallet);
        return Promise.resolve(wallet);
      }),
      update: jest.fn().mockResolvedValue({}),
    },
    ledgerEntry: { create: jest.fn().mockResolvedValue({}) },
    agent: {
      findUnique: jest.fn().mockResolvedValue({ id: 'agent-1', wallet: { agentId: 'agent-1' } }),
      update: jest.fn().mockResolvedValue({}),
    },
    agentWallet: { update: jest.fn().mockResolvedValue({}) },
    commission: {
      findFirst: jest.fn().mockResolvedValue(opts.alreadyPaidFirstCardCommission ? { id: 'commission-existing' } : null),
      create: jest.fn().mockResolvedValue({}),
    },
    rate: { findUnique: jest.fn().mockResolvedValue({ value: 135 }) },
    $transaction: jest.fn((cb: any) => cb(prisma)),
  };

  const service = new FreshService(prisma, { get: jest.fn() }, {}, {}, {}, { assertActivated: jest.fn().mockResolvedValue(undefined) });

  jest.spyOn(service as any, 'nfcPost').mockImplementation(async (endpoint: any) => {
    if (endpoint === 'cardkyc') return { response: { customer_id: 'cust-1', status: 'approved' } };
    if (endpoint === 'create-nfc-card') return { response: { card_id: 'card-1' } };
    throw new Error(`unexpected nfcPost endpoint ${endpoint}`);
  });
  jest.spyOn(service as any, 'resolveIdFrontImageBase64').mockResolvedValue('base64img');

  return { service, prisma, user, wallet, masterWallet };
}
