import { BadRequestException } from '@nestjs/common';
import { WalletService } from './wallet.service';

// 2026-11-04, Greffin — createManualTopup (dépôt international) ne doit
// JAMAIS convertir avec un taux deviné (ancien fallback silencieux à 140).
// Si USD_HTG manque/invalide en base → refus explicite, le même message
// que l'app doit afficher. createWithdrawRequest (retrait) garde l'ancien
// comportement, non touché — pas testé ici, voir wallet.service.ts.
function buildService(rateRow: any, wallet: any = { id: 'wallet-1' }) {
  const prisma = {
    wallet: { findUnique: jest.fn(async () => wallet) },
    rate: { findUnique: jest.fn(async () => rateRow) },
    transaction: { create: jest.fn(async (args: any) => ({ id: 'tx-1', ...args.data })) },
  };
  const service = new WalletService(prisma as any, {} as any, {} as any);
  return { service, prisma };
}

describe('WalletService.createManualTopup — taux USD_HTG strict (dépôt international)', () => {
  it('konvèti kòrèkteman lè USD_HTG egziste e valid', async () => {
    const { service, prisma } = buildService({ value: 135 });
    const result: any = await service.createManualTopup('user-1', 100, 'zelle');
    // 100 USD * 135 = 13500 HTG, frè 6% = 810, net = 12690
    expect(prisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ amount: 13500, fee: 810, netAmount: 12690 }) }),
    );
    expect(result.amount).toBe(13500);
  });

  it('refize ak mesaj egzat la si USD_HTG pa jwenn ditou an baz done', async () => {
    const { service } = buildService(null);
    await expect(service.createManualTopup('user-1', 100, 'zelle')).rejects.toThrow(
      new BadRequestException('To chanj lan pa disponib pou kounye a. Eseye ankò pita.'),
    );
  });

  it('refize si valè a envalid (0, negatif, oswa pa yon nonb)', async () => {
    for (const badValue of [0, -5, NaN, 'oops']) {
      const { service } = buildService({ value: badValue });
      await expect(service.createManualTopup('user-1', 100, 'cashapp')).rejects.toThrow(
        'To chanj lan pa disponib pou kounye a. Eseye ankò pita.',
      );
    }
  });

  it('yon metòd domestik (MONCASH) pa rele/depann de USD_HTG ditou', async () => {
    const { service, prisma } = buildService(null);
    const result: any = await service.createManualTopup('user-1', 500, 'moncash');
    expect(prisma.rate.findUnique).not.toHaveBeenCalled();
    expect(result.amount).toBe(500);
  });
});
