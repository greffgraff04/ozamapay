import { expectInvalid, expectValid } from '../common/validation/test-helpers';
import {
  ApplyBusinessDto,
  WithdrawDto,
  InviteMemberDto,
  CreateApiKeyDto,
  CreateBizWebhookDto,
  PayBusinessDto,
} from './business.service';

describe('ApplyBusinessDto (/business/apply)', () => {
  const valid = {
    businessName: 'Ozama Store',
    category: 'retail',
    tier: 'STARTER',
    phone: '+50912345678',
    address: '123 rue Capois',
  };

  it('aksepte yon payload valid', () => expectValid(ApplyBusinessDto, valid));

  it('rejte yon tier ki pa nan lis fèmen', () =>
    expectInvalid(ApplyBusinessDto, { ...valid, tier: 'UNLIMITED' }));
});

describe('WithdrawDto (/business/:id/withdraw)', () => {
  const valid = { amount: 1000, destination: 'PERSONAL_WALLET', pin: '1234' };

  it('aksepte yon payload valid', () => expectValid(WithdrawDto, valid));

  it('rejte yon destination ki pa nan lis fèmen', () =>
    expectInvalid(WithdrawDto, { ...valid, destination: 'CRYPTO_WALLET' }));

  it('rejte yon montan negatif', () => expectInvalid(WithdrawDto, { ...valid, amount: -1000 }));
});

describe('InviteMemberDto (/business/:id/members/invite)', () => {
  it('aksepte yon payload valid', () =>
    expectValid(InviteMemberDto, { email: 'a@b.com', role: 'CASHIER' }));

  it('rejte yon role ki pa nan lis fèmen', () =>
    expectInvalid(InviteMemberDto, { email: 'a@b.com', role: 'SUPERADMIN' }));
});

describe('CreateApiKeyDto (/business/:id/api-keys)', () => {
  it('aksepte yon payload valid', () =>
    expectValid(CreateApiKeyDto, { name: 'Prod key', mode: 'LIVE', permissions: ['READ', 'WRITE'] }));

  it('rejte yon permission ki pa nan lis fèmen', () =>
    expectInvalid(CreateApiKeyDto, { name: 'Prod key', mode: 'LIVE', permissions: ['SUPERADMIN'] }));
});

describe('CreateBizWebhookDto (/business/:id/webhooks)', () => {
  it('aksepte yon payload valid', () =>
    expectValid(CreateBizWebhookDto, { url: 'https://example.com/hook', events: ['payment.received'] }));

  it('rejte yon URL http:// (SSRF potentiel — risk idantifye nan odit)', () =>
    expectInvalid(CreateBizWebhookDto, { url: 'http://example.com/hook', events: ['payment.received'] }));

  it('rejte yon evenman ki pa nan lis fèmen', () =>
    expectInvalid(CreateBizWebhookDto, { url: 'https://example.com/hook', events: ['fake.event'] }));
});

describe('PayBusinessDto (/business/:id/pay)', () => {
  it('aksepte yon payload valid', () => expectValid(PayBusinessDto, { amount: 500, pin: '1234' }));

  it('rejte yon montan negatif', () => expectInvalid(PayBusinessDto, { amount: -500, pin: '1234' }));
});
