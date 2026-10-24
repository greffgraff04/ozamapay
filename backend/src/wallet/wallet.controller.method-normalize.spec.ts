import { WalletController } from './wallet.controller';

// Odit VALIDATION_MODE=log : ValidationModePipe sèlman aplike @Transform nan
// DTO a an mod "enforce" — an mod "log" (default jodi a) li retounen valè
// brit la san chanje l (wè validation-mode.pipe.ts transform()). Donk se
// kontwolè a ki dwe nòmalize method/serviceType anvan rele sèvis la, menm si
// webapp voye yo an miniskil. Tès sa yo verifye SÈVIS la resevwa byen valè
// nòmalize a (pa sèlman DTO a ki valid).
describe('WalletController — nòmalizasyon method/serviceType', () => {
  function buildController() {
    const walletService: any = {
      createWithdrawRequest: jest.fn().mockResolvedValue({ success: true }),
      createFinanceRequest: jest.fn().mockResolvedValue({ success: true }),
    };
    const imagekitService: any = { uploadFile: jest.fn() };
    const controller = new WalletController(walletService, imagekitService);
    return { controller, walletService };
  }

  it('createWithdrawRequest: method miniskil rive an MAJISKIL nan sèvis la', async () => {
    const { controller, walletService } = buildController();
    await controller.createWithdrawRequest(
      { user: { id: 'user-1' } } as any,
      { amount: 100, method: 'moncash', accountInfo: 'info' } as any,
    );
    expect(walletService.createWithdrawRequest).toHaveBeenCalledWith('user-1', 100, 'MONCASH', 'info');
  });

  it('createWithdrawRequest: method deja an MAJISKIL rete menm jan', async () => {
    const { controller, walletService } = buildController();
    await controller.createWithdrawRequest(
      { user: { id: 'user-1' } } as any,
      { amount: 100, method: 'MONCASH', accountInfo: 'info' } as any,
    );
    expect(walletService.createWithdrawRequest).toHaveBeenCalledWith('user-1', 100, 'MONCASH', 'info');
  });

  it('createFinanceRequest: serviceType miniskil rive an MAJISKIL nan sèvis la', async () => {
    const { controller, walletService } = buildController();
    await controller.createFinanceRequest(
      { user: { id: 'user-1' } } as any,
      { serviceType: 'natcash', amount: 100, details: 'detay' } as any,
      undefined,
    );
    expect(walletService.createFinanceRequest).toHaveBeenCalledWith('user-1', 'NATCASH', 100, 'detay', undefined);
  });
});
