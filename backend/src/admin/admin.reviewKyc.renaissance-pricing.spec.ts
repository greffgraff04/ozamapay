// Swit backend pou nouvo pri (RENAISSANCE_PRICING_ENABLED) nan reviewKyc():
// KYC gratis — pa gen debi, pa gen Transaction/LedgerEntry, pa gen komisyon
// KYC. RENAISSANCE_PRICING_ENABLED li env a yon sèl fwa lè constants.ts
// chaje — jest.resetModules() + require() fre obligatwa pou chak tès.

function buildService(opts: { agentIdOnKyc?: string | null; userIsAgent?: boolean }) {
  const kyc = { id: 'kyc-1', userId: 'user-1', status: 'PENDING', agentId: opts.agentIdOnKyc ?? null };
  const userWallet = { id: 'wallet-1', userId: 'user-1', balance: 1_000_000 };
  const masterWallet = { id: 'master-wallet', userId: process.env.OZAMAPAY_MASTER_ID, balance: 5_000_000 };

  const prisma: any = {
    kyc: {
      findUnique: jest.fn().mockResolvedValue(kyc),
      update: jest.fn().mockImplementation(async ({ data }: any) => ({ ...kyc, ...data })),
    },
    rate: { findUnique: jest.fn().mockResolvedValue({ value: 135 }) },
    wallet: {
      findUnique: jest.fn().mockResolvedValue(userWallet),
      update: jest.fn().mockResolvedValue(userWallet),
    },
    transaction: { create: jest.fn().mockImplementation(async ({ data }: any) => ({ id: 'tx-1', ...data })) },
    ledgerEntry: { create: jest.fn().mockResolvedValue({}) },
    agent: { update: jest.fn().mockResolvedValue({}) },
    agentWallet: { update: jest.fn().mockResolvedValue({}) },
    commission: { create: jest.fn().mockResolvedValue({}) },
    user: {
      findUnique: jest.fn().mockResolvedValue({ id: 'user-1', email: 'c@e.com' }),
      update: jest.fn().mockResolvedValue({}),
    },
    adminActionLog: { create: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn((cb: any) => cb(prisma)),
  };
  // findFirst used for master wallet lookup in the legacy (flag=false) path.
  prisma.wallet.findFirst = jest.fn().mockResolvedValue(masterWallet);
  // agentExists check (does the KYC'd user themselves have an Agent record?)
  prisma.agent.findUnique = jest.fn((args: any) => {
    if (args.where.id) return Promise.resolve({ id: opts.agentIdOnKyc, wallet: { agentId: opts.agentIdOnKyc } });
    if (args.where.userId) return Promise.resolve(opts.userIsAgent ? { id: 'own-agent-1', userId: 'user-1' } : null);
    return Promise.resolve(null);
  });

  const mailService: any = { sendKycApproved: jest.fn().mockResolvedValue(undefined), sendKycRejected: jest.fn().mockResolvedValue(undefined) };
  const kycService: any = {};

  const { AdminService: FreshAdminService } = require('./admin.service');
  const service = new FreshAdminService(prisma, mailService, kycService);
  return { service, prisma, mailService };
}

describe('AdminService.reviewKyc — Renaissance pricing', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV, OZAMAPAY_MASTER_ID: 'master-user-id' };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('flag=false: konpòtman ansyen an — debite 3375 HTG, kreye Transaction, peye 405 HTG komisyon', async () => {
    process.env.RENAISSANCE_PRICING_ENABLED = 'false';
    const { service, prisma } = buildService({ agentIdOnKyc: 'agent-1' });

    await service.reviewKyc('kyc-1', 'APPROVED', 'admin-1');

    expect(prisma.wallet.update).toHaveBeenCalledWith({ where: { userId: 'user-1' }, data: { balance: { decrement: 3375 } } });
    expect(prisma.transaction.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ title: 'Frè KYC', amount: 3375 }) }));
    expect(prisma.commission.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ agentId: 'agent-1', amount: 405, type: 'KYC' }) }));
  });

  it('flag=true: KYC gratis — pa gen debi, pa gen Transaction, pa gen komisyon KYC', async () => {
    process.env.RENAISSANCE_PRICING_ENABLED = 'true';
    const { service, prisma } = buildService({ agentIdOnKyc: 'agent-1' });

    const result = await service.reviewKyc('kyc-1', 'APPROVED', 'admin-1');

    expect(result.status).toBe('APPROVED');
    expect(prisma.wallet.update).not.toHaveBeenCalled();
    expect(prisma.transaction.create).not.toHaveBeenCalled();
    expect(prisma.ledgerEntry.create).not.toHaveBeenCalled();
    expect(prisma.commission.create).not.toHaveBeenCalled();
  });

  it('flag=true: itilizatè ki gen pwòp Agent rekò li toujou aktive apre KYC apwouve (endepandan de frè)', async () => {
    process.env.RENAISSANCE_PRICING_ENABLED = 'true';
    const { service, prisma } = buildService({ agentIdOnKyc: null, userIsAgent: true });

    await service.reviewKyc('kyc-1', 'APPROVED', 'admin-1');

    expect(prisma.agent.update).toHaveBeenCalledWith({ where: { userId: 'user-1' }, data: { status: 'ACTIVE' } });
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'user-1' }, data: { role: 'AGENT' } });
  });

  it('rejte KYC pa janm debite, nenpòt valè flag la', async () => {
    process.env.RENAISSANCE_PRICING_ENABLED = 'false';
    const { service, prisma } = buildService({ agentIdOnKyc: 'agent-1' });

    const result = await service.reviewKyc('kyc-1', 'REJECTED', 'admin-1');

    expect(result.status).toBe('REJECTED');
    expect(prisma.wallet.update).not.toHaveBeenCalled();
    expect(prisma.transaction.create).not.toHaveBeenCalled();
    expect(prisma.commission.create).not.toHaveBeenCalled();
  });
});
