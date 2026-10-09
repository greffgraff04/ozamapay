import { BadRequestException } from '@nestjs/common';

// MASTER_ID est lu depuis process.env au chargement du module — il faut donc
// fixer la variable d'env PUIS importer le service via require() dynamique,
// avant tout import statique qui chargerait le module trop tôt.
process.env.OZAMAPAY_MASTER_ID = 'master-id';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { GiftCardsService } = require('./giftcards.service');

const RANGE_PRODUCT = {
  productName: 'Amazon Gift Card',
  denominationType: 'RANGE',
  minSenderDenomination: 5,
  maxSenderDenomination: 500,
};

const FIXED_PRODUCT = {
  productName: 'iTunes Gift Card',
  denominationType: 'FIXED',
  fixedSenderDenominations: [10, 25, 50],
};

// Produit facturé en EUR (pas USD) — les champs SENDER restent de simples
// nombres, peu importe la devise réelle ; la validation ne doit jamais
// dépendre d'un code devise codé en dur.
const EUR_PRODUCT = {
  productName: 'Carrefour EUR Gift Card',
  denominationType: 'FIXED',
  senderCurrencyCode: 'EUR',
  recipientCurrencyCode: 'EUR',
  fixedSenderDenominations: [9, 18, 45],
};

function mockFetchFor(product: any) {
  return jest.fn(async (url: string, init?: any) => {
    const method = init?.method ?? 'GET';
    if (method === 'GET' && url.includes('/products/')) {
      return { ok: true, json: async () => product } as any;
    }
    if (method === 'POST' && url.includes('/orders')) {
      return { ok: true, json: async () => ({ transactionId: 999 }) } as any;
    }
    if (method === 'GET' && url.includes('/cards')) {
      return { ok: true, json: async () => [{ cardNumber: 'FAKE-CODE-123' }] } as any;
    }
    throw new Error(`Fetch inatandi nan tès: ${method} ${url}`);
  });
}

// Mock Prisma avec un état de solde partagé et mutable, pour pouvoir
// reproduire une vraie course (deux appels qui lisent/écrivent le même
// "compte") sans base de données réelle.
function buildPrismaMock(initialUserBalance = 100000, initialMasterBalance = 1000) {
  const state: any = { user: initialUserBalance, master: initialMasterBalance };

  const applyDelta = (key: 'user' | 'master', data: any) => {
    if (data?.balance?.increment !== undefined) state[key] += Number(data.balance.increment);
    if (data?.balance?.decrement !== undefined) state[key] -= Number(data.balance.decrement);
  };

  const mock: any = {
    rate: { findUnique: jest.fn().mockResolvedValue({ value: 140 }) },
    user: { findUnique: jest.fn().mockResolvedValue({ id: 'user-1', email: 'user@example.com' }) },
    giftCardOrder: {
      create: jest.fn().mockResolvedValue({ id: 'order-1' }),
      update: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn().mockResolvedValue({ id: 'order-1', status: 'PENDING' }),
    },
    transaction: {
      create: jest.fn().mockResolvedValue({ id: 'tx-1' }),
      update: jest.fn().mockResolvedValue({}),
    },
    ledgerEntry: { create: jest.fn().mockResolvedValue({}) },
    wallet: {
      findUnique: jest.fn((args: any) => {
        const isMaster = args.where.userId === 'master-id';
        return Promise.resolve({
          id: isMaster ? 'wallet-master' : 'wallet-user',
          userId: args.where.userId,
          balance: isMaster ? state.master : state.user,
        });
      }),
      update: jest.fn((args: any) => {
        const isMaster = args.where.userId === 'master-id';
        applyDelta(isMaster ? 'master' : 'user', args.data);
        return Promise.resolve({
          id: isMaster ? 'wallet-master' : 'wallet-user',
          userId: args.where.userId,
          balance: isMaster ? state.master : state.user,
        });
      }),
      // Débit conditionnel — le cœur du correctif anti-race : la vérification
      // ET la décrémentation se font dans la même opération synchrone sur
      // l'état partagé, exactement comme un UPDATE ... WHERE balance >= X
      // verrouillé ligne par ligne le ferait en Postgres.
      updateMany: jest.fn((args: any) => {
        const gte = Number(args.where.balance?.gte ?? 0);
        if (state.user < gte) return Promise.resolve({ count: 0 });
        applyDelta('user', args.data);
        return Promise.resolve({ count: 1 });
      }),
    },
  };
  mock.$transaction = jest.fn((cb: any) => cb(mock));
  mock.__state = state;
  return mock;
}

describe('GiftCardsService.orderGiftCard — validation du prix contre le catalogue (hotfix)', () => {
  let prismaMock: any;
  let service: any;
  const reloadlyAuthMock = { getToken: jest.fn().mockResolvedValue('fake-token') };

  beforeEach(() => {
    prismaMock = buildPrismaMock();
    service = new GiftCardsService(prismaMock, reloadlyAuthMock);
  });

  it('refuse un prix client manipulé (négatif) qui sort du range catalogue', async () => {
    (global as any).fetch = mockFetchFor(RANGE_PRODUCT);

    await expect(service.orderGiftCard('user-1', 55, -100)).rejects.toThrow(BadRequestException);

    // Aucune mutation de solde ne doit avoir lieu — le rejet se fait avant
    // toute transaction DB, contrairement au comportement pré-hotfix.
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('accepte un prix correct (conforme au catalogue) et journalise Transaction + LedgerEntry', async () => {
    (global as any).fetch = mockFetchFor(RANGE_PRODUCT);

    const result = await service.orderGiftCard('user-1', 55, 50);

    expect(result.status).toBe('COMPLETED');
    expect(result.unitPrice).toBe(50);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.transaction.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.ledgerEntry.create).toHaveBeenCalledTimes(2); // débit utilisateur + crédit master
  });

  it('refuse une valeur qui n\'existe pas dans le catalogue (produit à dénominations fixes)', async () => {
    (global as any).fetch = mockFetchFor(FIXED_PRODUCT);

    // 15 n'est pas dans [10, 25, 50]
    await expect(service.orderGiftCard('user-1', 77, 15)).rejects.toThrow(BadRequestException);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('débit atomique : 2 commandes simultanées, solde pour une seule → 1 acceptée, 1 refusée', async () => {
    (global as any).fetch = mockFetchFor(RANGE_PRODUCT);

    // unitPrice=50, taux=140, marge=5% → htgCost = 50*140*1.05 = 7350.
    // On ne met QUE 7350 HTG sur le compte : exactement de quoi payer une
    // commande, jamais deux.
    const htgCostForOne = 50 * 140 * 1.05;
    prismaMock = buildPrismaMock(htgCostForOne, 1000);
    service = new GiftCardsService(prismaMock, reloadlyAuthMock);

    const results = await Promise.allSettled([
      service.orderGiftCard('user-1', 55, 50),
      service.orderGiftCard('user-1', 55, 50),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(BadRequestException);
    expect((rejected[0] as PromiseRejectedResult).reason.message).toMatch(/ensifizan/i);

    // Le solde ne doit jamais être devenu négatif, et seule une décrémentation
    // a eu lieu (pas de double-débit, pas de débit fantôme).
    expect(prismaMock.__state.user).toBe(0);
  });

  it('accepte une carte non-USD (EUR) et facture au montant SENDER exact', async () => {
    (global as any).fetch = mockFetchFor(EUR_PRODUCT);

    const result = await service.orderGiftCard('user-1', 99, 18);

    expect(result.status).toBe('COMPLETED');
    expect(result.unitPrice).toBe(18); // montant SENDER, peu importe la devise réelle (EUR ici)
    expect(prismaMock.transaction.create).toHaveBeenCalledTimes(1);
  });
});
