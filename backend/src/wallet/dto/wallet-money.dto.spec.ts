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

  // Odit VALIDATION_MODE=log (2026-10) jwenn 1686 echèk sou sa a — webapp
  // voye "moncash"/"bank"/etc an miniskil. @Transform nan DTO a dwe aksepte
  // DE KA yo pou pa kraze retrè kliyan si enforce ta aktive.
  it('aksepte method an miniskil (webapp aktyèl la) — @Transform normalize l', () =>
    expectValid(WithdrawRequestDto, { amount: 100, method: 'moncash', accountInfo: 'info' }));

  it('aksepte method an MAJISKIL tou', () =>
    expectValid(WithdrawRequestDto, { amount: 100, method: 'MONCASH', accountInfo: 'info' }));

  it('rejte yon method ki pa nan lis fèmen, kèlkeswa ka', () =>
    expectInvalid(WithdrawRequestDto, { amount: 100, method: 'wise', accountInfo: 'info' }));
});

describe('FinanceRequestDto (/wallet/finance-request)', () => {
  it('aksepte yon payload valid', () =>
    expectValid(FinanceRequestDto, { serviceType: 'NATCASH', amount: 100, details: 'detay' }));

  it('rejte serviceType "WISE" (sèvis retire)', () =>
    expectInvalid(FinanceRequestDto, { serviceType: 'WISE', amount: 100, details: 'detay' }));

  it('rejte yon montan ki pa fini (NaN)', () =>
    expectInvalid(FinanceRequestDto, { serviceType: 'NATCASH', amount: NaN, details: 'detay' }));

  it('aksepte serviceType an miniskil — @Transform normalize l', () =>
    expectValid(FinanceRequestDto, { serviceType: 'natcash', amount: 100, details: 'detay' }));
});
