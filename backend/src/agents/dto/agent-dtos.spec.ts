import { expectInvalid, expectValid } from '../../common/validation/test-helpers';
import { AgentTopupDto, AgentWithdrawDto, WithdrawCommissionDto } from './agent-transactions.dto';
import { LiquidityRequestDto, ApplyAgentDto } from './liquidity-request.dto';

describe('AgentTopupDto (/agents/topup)', () => {
  it('aksepte yon payload valid', () =>
    expectValid(AgentTopupDto, { email: 'client@example.com', amount: 1000 }));

  it('rejte yon montan negatif (vol de fonds — risk #1 nan odit)', () =>
    expectInvalid(AgentTopupDto, { email: 'client@example.com', amount: -1000 }));
});

describe('AgentWithdrawDto (/agents/withdraw-user)', () => {
  it('aksepte yon payload valid', () =>
    expectValid(AgentWithdrawDto, { email: 'client@example.com', userPin: '1234', amount: 500 }));

  it('rejte yon PIN ki pa nimerik', () =>
    expectInvalid(AgentWithdrawDto, { email: 'client@example.com', userPin: 'abcd', amount: 500 }));
});

describe('WithdrawCommissionDto (/agents/withdraw)', () => {
  it('aksepte yon payload valid', () => expectValid(WithdrawCommissionDto, { amount: 1000 }));

  it('rejte yon montan negatif (risk #2 nan odit)', () =>
    expectInvalid(WithdrawCommissionDto, { amount: -1000 }));
});

describe('LiquidityRequestDto (/agents/liquidity-request)', () => {
  it('aksepte yon payload valid', () =>
    expectValid(LiquidityRequestDto, { amount: 10000, method: 'CASH', accountInfo: 'info' }));

  it('rejte yon method ki pa nan lis fèmen', () =>
    expectInvalid(LiquidityRequestDto, { amount: 10000, method: 'BITCOIN', accountInfo: 'info' }));

  it('rejte yon montan zewo', () =>
    expectInvalid(LiquidityRequestDto, { amount: 0, method: 'CASH', accountInfo: 'info' }));
});

describe('ApplyAgentDto (/agents/apply)', () => {
  it('aksepte yon payload valid (businessName opsyonèl)', () => expectValid(ApplyAgentDto, {}));

  it('rejte yon businessName ki pa yon string', () =>
    expectInvalid(ApplyAgentDto, { businessName: 12345 }));
});
