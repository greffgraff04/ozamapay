import { MailService } from './mail.service';

describe('MailService.sendOtpCode — OTP_EMAIL_PROVIDER routing (fix/otp-hostinger-smtp)', () => {
  const ORIGINAL_ENV = { ...process.env };
  let service: MailService;
  let sendTransacEmail: jest.Mock;
  let sendMail: jest.Mock;

  beforeEach(() => {
    process.env.BREVO_API_KEY = 'test-key';
    delete process.env.APP_ENV;
    delete process.env.STAGING_EMAIL_ALLOWLIST;
    service = new MailService();
    sendTransacEmail = jest.fn().mockResolvedValue({ messageId: 'brevo-msg-id' });
    (service as any).brevo = { transactionalEmails: { sendTransacEmail } };
    sendMail = jest.fn();
    // Bypass getHostingerTransport()'s env-var validation entirely — these
    // tests exercise the dispatch/fallback logic, not SMTP config parsing.
    (service as any).hostingerTransport = { sendMail };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.clearAllMocks();
  });

  it('flag absent → unchanged Brevo path, SMTP never touched', async () => {
    delete process.env.OTP_EMAIL_PROVIDER;
    await service.sendOtpCode('client@example.com', 'Client', '123456', 'NEW_DEVICE');

    expect(sendTransacEmail).toHaveBeenCalledTimes(1);
    expect(sendTransacEmail.mock.calls[0][0].subject).toBe('Kòd OTP OZAMAPAY');
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('flag="brevo" explicit → same as absent, unchanged Brevo path', async () => {
    process.env.OTP_EMAIL_PROVIDER = 'brevo';
    await service.sendOtpCode('client@example.com', 'Client', '123456', 'REGISTER');

    expect(sendTransacEmail).toHaveBeenCalledTimes(1);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('flag="hostinger" + SMTP succeeds → sent via Hostinger, Brevo never called', async () => {
    process.env.OTP_EMAIL_PROVIDER = 'hostinger';
    sendMail.mockResolvedValue({ messageId: 'smtp-msg-id' });

    await service.sendOtpCode('client@example.com', 'Client', '654321', 'RESET');

    expect(sendMail).toHaveBeenCalledTimes(1);
    const call = sendMail.mock.calls[0][0];
    expect(call.to).toBe('client@example.com');
    expect(call.subject).toBe('Kòd OTP OZAMAPAY');
    expect(call.html).toContain('654321');
    expect(sendTransacEmail).not.toHaveBeenCalled();
  });

  it('flag="hostinger" + SMTP fails + Brevo fallback succeeds → resolves, both attempts visible in logs', async () => {
    process.env.OTP_EMAIL_PROVIDER = 'hostinger';
    sendMail.mockRejectedValue(new Error('ECONNREFUSED smtp.hostinger.com:465'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      service.sendOtpCode('client@example.com', 'Client', '111222', 'CHANGE_PHONE'),
    ).resolves.toBeUndefined();

    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendTransacEmail).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('SMTP Hostinger echwe'));
    errorSpy.mockRestore();
  });

  it('flag="hostinger" + SMTP fails + Brevo fallback ALSO fails → throws a clear error, never a false success', async () => {
    process.env.OTP_EMAIL_PROVIDER = 'hostinger';
    sendMail.mockRejectedValue(new Error('ECONNREFUSED smtp.hostinger.com:465'));
    sendTransacEmail.mockRejectedValue(new Error('Insufficient credits'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      service.sendOtpCode('client@example.com', 'Client', '999888', 'DELETE_ACCOUNT'),
    ).rejects.toThrow(/Hostinger.*Brevo|ECONNREFUSED.*Insufficient credits/);

    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendTransacEmail).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('fallback Brevo TOU echwe'));
    errorSpy.mockRestore();
  });

  it('flag="hostinger" in staging + recipient NOT allowlisted → silently skipped, neither provider called, no throw', async () => {
    process.env.OTP_EMAIL_PROVIDER = 'hostinger';
    process.env.APP_ENV = 'staging';
    process.env.STAGING_EMAIL_ALLOWLIST = 'qa@ozamapay.com';

    await expect(
      service.sendOtpCode('real.customer@example.com', 'Client', '000000', 'NEW_DEVICE'),
    ).resolves.toBeUndefined();

    expect(sendMail).not.toHaveBeenCalled();
    expect(sendTransacEmail).not.toHaveBeenCalled();
  });

  it('getHostingerTransport() throws a clear error when SMTP_* env vars are missing', () => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    const fresh = new MailService();
    expect(() => (fresh as any).getHostingerTransport()).toThrow(/SMTP Hostinger pa konfigire/);
  });
});
