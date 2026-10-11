import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AgentsService } from './agents.service';

// Hotfix/agents-amount : /agents/topup, /agents/withdraw ak
// /agents/liquidity-request pa t gen okenn kontwòl sou montan an (negatif,
// zewo, NaN, 3+ chif apre pwen, oswa plafon). Tès sa yo verifye montan
// envalid yo rejte AVAN okenn lekti/ekriti nan BD, e yon montan valid toujou
// aksepte e fè yon debi atomik.
function buildPrismaMock() {
  const state = { agentWalletBalance: 100_000, userWalletBalance: 0 };

  const tx: any = {
    agent: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'agent-1',
        userId: 'agent-user-1',
        status: 'ACTIVE',
        wallet: { balance: state.agentWalletBalance },
      }),
      update: jest.fn().mockResolvedValue({}),
    },
    agentWallet: {
      updateMany: jest.fn((args: any) => {
        const gte = Number(args.where?.balance?.gte ?? 0);
        if (state.agentWalletBalance < gte) return Promise.resolve({ count: 0 });
        const dec = args.data?.balance?.decrement;
        const inc = args.data?.balance?.increment;
        if (dec !== undefined) state.agentWalletBalance -= Number(dec);
        if (inc !== undefined) state.agentWalletBalance += Number(inc);
        return Promise.resolve({ count: 1 });
      }),
      update: jest.fn((args: any) => {
        const dec = args.data?.balance?.decrement;
        const inc = args.data?.balance?.increment;
        if (dec !== undefined) state.agentWalletBalance -= Number(dec);
        if (inc !== undefined) state.agentWalletBalance += Number(inc);
        return Promise.resolve({});
      }),
    },
    wallet: {
      findUnique: jest.fn().mockResolvedValue({ id: 'wallet-1', userId: 'client-1', balance: 0 }),
      update: jest.fn((args: any) => {
        const dec = args.data?.balance?.decrement;
        const inc = args.data?.balance?.increment;
        if (dec !== undefined) state.userWalletBalance -= Number(dec);
        if (inc !== undefined) state.userWalletBalance += Number(inc);
        return Promise.resolve({});
      }),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({ id: 'client-1', email: 'client@example.com', name: 'Kliyan' }),
    },
    transaction: { create: jest.fn().mockResolvedValue({ id: 'tx-1' }) },
    commission: { create: jest.fn().mockResolvedValue({}) },
    liquidityRequest: { create: jest.fn().mockResolvedValue({ id: 'lr-1' }) },
  };

  const prisma: any = {
    agent: tx.agent,
    agentWallet: tx.agentWallet,
    wallet: tx.wallet,
    user: tx.user,
    transaction: tx.transaction,
    commission: tx.commission,
    liquidityRequest: tx.liquidityRequest,
    $transaction: jest.fn((arg: any) => (typeof arg === 'function' ? arg(tx) : Promise.all(arg))),
  };

  return { prisma, tx, state };
}

const INVALID_AMOUNTS: Array<[string, any]> = [
  ['negatif', -100],
  ['zewo', 0],
  ['NaN', NaN],
  ['3 chif apre pwen', 10.001],
];

describe('AgentsService — gad-fou montan (hotfix/agents-amount)', () => {
  let service: AgentsService;
  let prisma: any;

  beforeEach(() => {
    ({ prisma } = buildPrismaMock());
    const mailService: any = {
      sendAgentTopupConfirmed: jest.fn(),
      sendAgentWithdrawConfirmed: jest.fn(),
    };
    service = new AgentsService(prisma, mailService);
  });

  describe('createLiquidityRequest (/agents/liquidity-request)', () => {
    for (const [label, amount] of INVALID_AMOUNTS) {
      it(`rejte yon montan ${label} anvan okenn aksè BD`, async () => {
        await expect(
          service.createLiquidityRequest('user-1', amount, 'CASH', 'info'),
        ).rejects.toThrow(BadRequestException);
        expect(prisma.agent.findUnique).not.toHaveBeenCalled();
      });
    }

    it('rejte yon montan ki depase plafon maksimòm', async () => {
      await expect(
        service.createLiquidityRequest('user-1', 500_001, 'CASH', 'info'),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.agent.findUnique).not.toHaveBeenCalled();
    });

    it('aksepte yon montan valid', async () => {
      const result = await service.createLiquidityRequest('user-1', 5_000, 'CASH', 'info');
      expect(result).toBeDefined();
      expect(prisma.liquidityRequest.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('withdrawCommission (/agents/withdraw)', () => {
    for (const [label, amount] of INVALID_AMOUNTS) {
      it(`rejte yon montan ${label} anvan okenn aksè BD`, async () => {
        await expect(service.withdrawCommission('user-1', amount)).rejects.toThrow(BadRequestException);
        expect(prisma.$transaction).not.toHaveBeenCalled();
      });
    }

    it('rejte yon montan ki depase plafon maksimòm', async () => {
      await expect(service.withdrawCommission('user-1', 200_001)).rejects.toThrow(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('aksepte yon montan valid e fè yon debi atomik kondisyonèl', async () => {
      const result: any = await service.withdrawCommission('user-1', 1_000);
      expect(result.success).toBe(true);
      expect(prisma.agentWallet.updateMany).toHaveBeenCalledTimes(1);
    });

    it('rejte 403 pou yon itilizatè ki pa yon ajan', async () => {
      prisma.agent.findUnique.mockResolvedValueOnce(null);
      await expect(service.withdrawCommission('non-agent-user', 1_000)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.agentWallet.updateMany).not.toHaveBeenCalled();
    });

    it('rejte 403 pou yon ajan ki pa ACTIVE', async () => {
      prisma.agent.findUnique.mockResolvedValueOnce({ id: 'agent-1', status: 'PENDING' });
      await expect(service.withdrawCommission('pending-agent-user', 1_000)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.agentWallet.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('topupUser (/agents/topup)', () => {
    for (const [label, amount] of INVALID_AMOUNTS) {
      it(`rejte yon montan ${label} anvan okenn aksè BD`, async () => {
        await expect(
          service.topupUser('agent-user-1', { email: 'client@example.com', amount } as any),
        ).rejects.toThrow(BadRequestException);
        expect(prisma.user.findUnique).not.toHaveBeenCalled();
      });
    }

    it('rejte yon montan ki depase plafon maksimòm', async () => {
      await expect(
        service.topupUser('agent-user-1', { email: 'client@example.com', amount: 200_001 } as any),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('aksepte yon montan valid e fè yon debi atomik kondisyonèl', async () => {
      const result: any = await service.topupUser('agent-user-1', {
        email: 'client@example.com',
        amount: 1_000,
      } as any);
      expect(result.success).toBe(true);
      expect(prisma.agentWallet.updateMany).toHaveBeenCalledTimes(1);
    });
  });
});
