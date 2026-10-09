import { MailService } from './mail.service';

describe('MailService — staging email allowlist', () => {
  const ORIGINAL_ENV = { ...process.env };
  let service: MailService;
  let sendTransacEmail: jest.Mock;

  beforeEach(() => {
    process.env.BREVO_API_KEY = 'test-key';
    service = new MailService();
    sendTransacEmail = jest.fn().mockResolvedValue({ messageId: 'x' });
    (service as any).brevo = { transactionalEmails: { sendTransacEmail } };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('sends normally when APP_ENV is unset — unchanged prod behavior', async () => {
    delete process.env.APP_ENV;
    delete process.env.STAGING_EMAIL_ALLOWLIST;
    await (service as any).send('customer@example.com', 'Subject', '<p>hi</p>');
    expect(sendTransacEmail).toHaveBeenCalledTimes(1);
  });

  it('blocks a non-allowlisted recipient in staging', async () => {
    process.env.APP_ENV = 'staging';
    process.env.STAGING_EMAIL_ALLOWLIST = 'qa@ozamapay.com';
    await (service as any).send('real.customer@example.com', 'Subject', '<p>hi</p>');
    expect(sendTransacEmail).not.toHaveBeenCalled();
  });

  it('allows a recipient that is in STAGING_EMAIL_ALLOWLIST (case-insensitive)', async () => {
    process.env.APP_ENV = 'staging';
    process.env.STAGING_EMAIL_ALLOWLIST = 'qa@ozamapay.com, other@ozamapay.com';
    await (service as any).send('QA@OZAMAPAY.COM', 'Subject', '<p>hi</p>');
    expect(sendTransacEmail).toHaveBeenCalledTimes(1);
  });

  it('blocks everything in staging when the allowlist is unset/empty', async () => {
    process.env.APP_ENV = 'staging';
    delete process.env.STAGING_EMAIL_ALLOWLIST;
    await (service as any).send('qa@ozamapay.com', 'Subject', '<p>hi</p>');
    expect(sendTransacEmail).not.toHaveBeenCalled();
  });
});
