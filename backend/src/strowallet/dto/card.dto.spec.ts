import { expectInvalid, expectValid } from '../../common/validation/test-helpers';
import { CreateCardDto, FundCardDto, CardIdDto } from './card.dto';

describe('CreateCardDto (/v1/cards/create)', () => {
  it('aksepte yon payload valid', () =>
    expectValid(CreateCardDto, { provider: 'STROWALLET_NFC', amount_usd: 50 }));

  it('aksepte yon payload san amount_usd (chemen BSICARDS_EUR)', () =>
    expectValid(CreateCardDto, { provider: 'BSICARDS_MASTERCARD_EUR' }));

  it('rejte yon provider enkoni', () => expectInvalid(CreateCardDto, { provider: 'FAKE_PROVIDER' }));

  it('rejte yon amount_usd ki depase $500', () =>
    expectInvalid(CreateCardDto, { provider: 'STROWALLET_NFC', amount_usd: 5000 }));
});

describe('FundCardDto (/v1/cards/recharge)', () => {
  it('aksepte yon payload valid', () => expectValid(FundCardDto, { amount_usd: 100 }));

  it('rejte yon montan negatif', () => expectInvalid(FundCardDto, { amount_usd: -100 }));
});

describe('CardIdDto (/v1/cards/secret-details, /freeze, /unfreeze)', () => {
  it('aksepte yon payload vid (cardId opsyonèl)', () => expectValid(CardIdDto, {}));

  it('rejte yon cardId ki pa yon string', () => expectInvalid(CardIdDto, { cardId: 12345 }));
});
