import { expectInvalid, expectValid } from '../../common/validation/test-helpers';
import {
  AdminTopupDto,
  UpdateAgentPackageDto,
  ProcessFinanceRequestDto,
  ProcessTransactionDto,
  UpdateBusinessTierDto,
} from './admin-money.dto';

describe('AdminTopupDto (/admin/users/:userId/topup, /admin/agents/:agentId/topup)', () => {
  it('aksepte yon payload valid', () => expectValid(AdminTopupDto, { amount: 1000 }));

  it('rejte yon montan NaN (gap idantifye nan odit — pa gen gad explicit)', () =>
    expectInvalid(AdminTopupDto, { amount: NaN }));
});

describe('UpdateAgentPackageDto (/admin/agents/:agentId/package)', () => {
  it('aksepte yon payload valid', () =>
    expectValid(UpdateAgentPackageDto, { packageType: 'VIP_AGENCE', customCommission: 2.5, maxLimit: 50000 }));

  it('rejte yon commission negatif', () =>
    expectInvalid(UpdateAgentPackageDto, { customCommission: -5 }));

  it('rejte yon commission pi gwo pase 100%', () =>
    expectInvalid(UpdateAgentPackageDto, { customCommission: 150 }));
});

describe('ProcessFinanceRequestDto (/admin/finance-requests/:id/process)', () => {
  it('aksepte yon payload valid', () => expectValid(ProcessFinanceRequestDto, { status: 'COMPLETED' }));

  it('rejte yon status ki pa nan lis fèmen', () =>
    expectInvalid(ProcessFinanceRequestDto, { status: 'MAYBE' }));
});

describe('ProcessTransactionDto (/admin/transactions/:id/process)', () => {
  it('aksepte yon payload valid', () => expectValid(ProcessTransactionDto, { status: 'REJECTED' }));

  it('rejte yon status ki pa nan lis fèmen', () =>
    expectInvalid(ProcessTransactionDto, { status: 'MAYBE' }));
});

describe('UpdateBusinessTierDto (/admin/businesses/:id/tier)', () => {
  it('aksepte yon payload valid', () => expectValid(UpdateBusinessTierDto, { tier: 'PRO' }));

  it('rejte yon tier ki pa nan lis fèmen', () =>
    expectInvalid(UpdateBusinessTierDto, { tier: 'UNLIMITED' }));
});
