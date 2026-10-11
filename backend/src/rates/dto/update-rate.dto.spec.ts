import { expectInvalid, expectValid } from '../../common/validation/test-helpers';
import { UpdateRateDto } from './update-rate.dto';

describe('UpdateRateDto (/rates/update)', () => {
  it('aksepte yon payload valid', () => expectValid(UpdateRateDto, { key: 'USD_HTG', value: 140 }));

  it('rejte yon kle ki pa nan lis fèmen', () =>
    expectInvalid(UpdateRateDto, { key: 'BITCOIN_HTG', value: 140 }));

  it('rejte yon valè ki depase fouchèt reyalis la (erè frap admin, risk #3 nan odit)', () =>
    expectInvalid(UpdateRateDto, { key: 'USD_HTG', value: 14000 }));

  it('rejte yon valè negatif', () => expectInvalid(UpdateRateDto, { key: 'USD_HTG', value: -1 }));
});
