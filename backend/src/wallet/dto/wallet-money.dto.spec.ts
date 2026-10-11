import { expectInvalid, expectValid } from '../../common/validation/test-helpers';
import { TransferDto, WALLET_TRANSFER_MAX_HTG } from './transfer.dto';
import { ManualTopupDto } from './manual-topup.dto';
import { WithdrawRequestDto } from './withdraw-request.dto';
import { FinanceRequestDto } from './finance-request.dto';

describe('TransferDto (/wallet/transfer, /wallet/transfer-p2p)', () => {
  it('aksepte yon payload valid', () =>
    expectValid(TransferDto, { recipientEmail: 'a@b.com', amount: 100, pin: '1234' }));

  it('rejte yon montan negatif', () =>
    expectInvalid(TransferDto, { recipientEmail: 'a@b.com', amount: -100, pin: '1234' }));

  it('rejte yon montan ki depase plafon', () =>
    expectInvalid(TransferDto, {
      recipientEmail: 'a@b.com',
      amount: WALLET_TRANSFER_MAX_HTG + 1,
      pin: '1234',
    }));

  it('rejte yon imel envalid', () =>
    expectInvalid(TransferDto, { recipientEmail: 'pa-yon-imel', amount: 100, pin: '1234' }));

  it('rejte yon PIN twò kout', () =>
    expectInvalid(TransferDto, { recipientEmail: 'a@b.com', amount: 100, pin: '12' }));
});

describe('ManualTopupDto (/wallet/topup)', () => {
  it('aksepte yon payload valid', () =>
    expectValid(ManualTopupDto, { amount: 500, method: 'MONCASH' }));

  it('rejte yon method ki pa nan lis fèmen (gap kritik idantifye nan odit)', () =>
    expectInvalid(ManualTopupDto, { amount: 500, method: 'YON_FOT_DE_FRAP' }));

  it('rejte yon montan negatif', () =>
    expectInvalid(ManualTopupDto, { amount: -500, method: 'MONCASH' }));
});

describe('WithdrawRequestDto (/wallet/withdraw)', () => {
  it('aksepte yon payload valid', () =>
    expectValid(WithdrawRequestDto, { amount: 100, method: 'MONCASH', accountInfo: 'info' }));

  it('rejte yon montan zewo', () =>
    expectInvalid(WithdrawRequestDto, { amount: 0, method: 'MONCASH', accountInfo: 'info' }));
});

describe('FinanceRequestDto (/wallet/finance-request)', () => {
  it('aksepte yon payload valid', () =>
    expectValid(FinanceRequestDto, { serviceType: 'NATCASH', amount: 100, details: 'detay' }));

  it('rejte serviceType "WISE" (sèvis retire)', () =>
    expectInvalid(FinanceRequestDto, { serviceType: 'WISE', amount: 100, details: 'detay' }));

  it('rejte yon montan ki pa fini (NaN)', () =>
    expectInvalid(FinanceRequestDto, { serviceType: 'NATCASH', amount: NaN, details: 'detay' }));
});
