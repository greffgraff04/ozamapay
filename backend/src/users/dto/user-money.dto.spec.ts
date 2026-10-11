import { expectInvalid, expectValid } from '../../common/validation/test-helpers';
import { AgentSelfTopupDto, ChangePinDto } from './user-money.dto';

describe('AgentSelfTopupDto (/user/agent/topup)', () => {
  it('aksepte yon payload valid', () => expectValid(AgentSelfTopupDto, { amount: 1000 }));

  it('rejte yon montan negatif', () => expectInvalid(AgentSelfTopupDto, { amount: -1000 }));
});

describe('ChangePinDto (/user/change-pin)', () => {
  it('aksepte yon PIN valid (4-6 chif)', () => expectValid(ChangePinDto, { newPin: '1234' }));

  it('rejte yon PIN non-nimerik', () => expectInvalid(ChangePinDto, { newPin: 'abcd' }));
});
