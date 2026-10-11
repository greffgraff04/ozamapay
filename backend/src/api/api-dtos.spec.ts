import { expectInvalid, expectValid } from '../common/validation/test-helpers';
import { InitiatePaymentDto, CreateWebhookDto } from './api.service';

describe('InitiatePaymentDto (/api/v1/payments/initiate)', () => {
  it('aksepte yon payload valid', () => expectValid(InitiatePaymentDto, { amount: 500 }));

  it('rejte yon devise ki pa nan lis fèmen (risk #10 nan odit)', () =>
    expectInvalid(InitiatePaymentDto, { amount: 500, currency: 'USD' }));

  it('rejte yon montan negatif', () => expectInvalid(InitiatePaymentDto, { amount: -500 }));
});

describe('CreateWebhookDto (/api/v1/webhooks)', () => {
  it('aksepte yon payload valid', () =>
    expectValid(CreateWebhookDto, { url: 'https://example.com/hook', events: ['payment.received'] }));

  it('rejte yon URL http:// (SSRF potentiel)', () =>
    expectInvalid(CreateWebhookDto, { url: 'http://example.com/hook', events: ['payment.received'] }));
});
