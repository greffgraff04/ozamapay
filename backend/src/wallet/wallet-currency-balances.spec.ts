import { NotFoundException } from '@nestjs/common';
import { WalletService } from './wallet.service';

// GET /wallet/balances — additif, L7. Verifye : (1) HTG soti nan
// Wallet.balance, USD/EUR soti nan WalletCurrencyBalance ; (2) defo 0 si
// pa gen ranje USD/EUR (jamè konvèti) ; (3) tout 3 wondi a 2 desimal ; (4)
// 404 si Wallet pa egziste ditou pou userId sa a.
function buildService(wallet: any, currencyBalances: any[]) {
  const prisma = {
    wallet: { findUnique: jest.fn(async () => wallet) },
    walletCurrencyBalance: { findMany: jest.fn(async () => currencyBalances) },
  };
  const service = new WalletService(prisma as any, {} as any, {} as any);
  return { service, prisma };
}

describe('WalletService.getCurrencyBalances (/wallet/balances)', () => {
  it('retounen HTG/USD/EUR lè tou de 2 egziste', async () => {
    const { service, prisma } = buildService(
      { balance: 1234.5 },
      [
        { currency: 'USD', balance: 10.004 },
        { currency: 'EUR', balance: 5.006 },
      ],
    );

    const result = await service.getCurrencyBalances('user-1');

    expect(result).toEqual({ HTG: 1234.5, USD: 10, EUR: 5.01 });
    expect(prisma.wallet.findUnique).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    expect(prisma.walletCurrencyBalance.findMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
  });

  it('USD/EUR defo 0 si pa gen ranje WalletCurrencyBalance (jamè konvèti)', async () => {
    const { service } = buildService({ balance: 500 }, []);
    const result = await service.getCurrencyBalances('user-2');
    expect(result).toEqual({ HTG: 500, USD: 0, EUR: 0 });
  });

  it('404 si Wallet pa jwenn pou userId sa a', async () => {
    const { service } = buildService(null, []);
    await expect(service.getCurrencyBalances('user-3')).rejects.toThrow(NotFoundException);
  });

  it('sèlman solde pwòp itilizatè a mande — pa gen lòt userId ki ka kole', async () => {
    const { service, prisma } = buildService({ balance: 0 }, []);
    await service.getCurrencyBalances('only-this-user');
    expect(prisma.wallet.findUnique).toHaveBeenCalledWith({ where: { userId: 'only-this-user' } });
    expect(prisma.walletCurrencyBalance.findMany).toHaveBeenCalledWith({ where: { userId: 'only-this-user' } });
  });
});
