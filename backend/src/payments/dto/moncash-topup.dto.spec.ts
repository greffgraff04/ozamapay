import { expectInvalid, expectValid } from '../../common/validation/test-helpers';
import { MonCashTopupDto, MonCashConnectInitiateDto } from './moncash-topup.dto';

describe('MonCashTopupDto (/payments/moncash/topup)', () => {
  it('aksepte yon payload valid', () => expectValid(MonCashTopupDto, { amount: 500 }));

  it('rejte yon montan negatif (vulnérabilité confirmée dans l\'audit)', () =>
    expectInvalid(MonCashTopupDto, { amount: -500 }));

  it('rejte yon montan non-fini (NaN)', () => expectInvalid(MonCashTopupDto, { amount: NaN }));
});

describe('MonCashConnectInitiateDto (/payments/moncashconnect/initiate)', () => {
  it('aksepte yon payload valid', () => expectValid(MonCashConnectInitiateDto, { amount: 500 }));

  it('rejte yon montan negatif', () => expectInvalid(MonCashConnectInitiateDto, { amount: -1 }));
});
