import { expectInvalid, expectValid } from '../../common/validation/test-helpers';
import { ConvertQuoteDto, ConvertExecuteDto } from './convert.dto';

describe('ConvertQuoteDto (GET /wallet/convert/quote)', () => {
  it('aksepte yon payload valid', () =>
    expectValid(ConvertQuoteDto, { from: 'HTG', to: 'USD', amount: 100 }));

  it('rejte yon devise sous ki pa sipòte', () =>
    expectInvalid(ConvertQuoteDto, { from: 'GBP', to: 'USD', amount: 100 }));

  it('rejte yon devise destinasyon ki pa sipòte', () =>
    expectInvalid(ConvertQuoteDto, { from: 'HTG', to: 'GBP', amount: 100 }));

  it('rejte yon montan negatif', () =>
    expectInvalid(ConvertQuoteDto, { from: 'HTG', to: 'USD', amount: -100 }));

  it('rejte yon montan zewo', () =>
    expectInvalid(ConvertQuoteDto, { from: 'HTG', to: 'USD', amount: 0 }));
});

describe('ConvertExecuteDto (POST /wallet/convert)', () => {
  it('aksepte yon payload valid', () => expectValid(ConvertExecuteDto, { quoteId: 'quote-1' }));

  it('rejte yon quoteId vid', () => expectInvalid(ConvertExecuteDto, { quoteId: '' }));
});
