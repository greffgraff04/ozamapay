import {
  isReviewAccountEnabled,
  isReviewAccountEmail,
  isReviewAccountLoginBypassActive,
  getReviewAccountEmailA,
  getReviewAccountEmailB,
  getReviewAccountOtpCode,
  assertNotReviewAccount,
  assertDemoTransferAllowed,
  isDemoToDemoTransfer,
  REVIEW_ACCOUNT_BLOCKED_MESSAGE,
} from './review-account.config';

const ENV_KEYS = ['APP_REVIEW_ACCOUNT_ENABLED', 'APP_REVIEW_ACCOUNT_EMAILS', 'APP_REVIEW_OTP_CODE'] as const;
const originalEnv: Record<string, string | undefined> = {};

function setEnv(enabled?: string, emails?: string, code?: string) {
  process.env.APP_REVIEW_ACCOUNT_ENABLED = enabled;
  process.env.APP_REVIEW_ACCOUNT_EMAILS = emails;
  process.env.APP_REVIEW_OTP_CODE = code;
}

beforeAll(() => {
  for (const key of ENV_KEYS) originalEnv[key] = process.env[key];
});

afterEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
});

afterAll(() => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
});

describe('review-account.config — switch absent/false (comportement par défaut, inchangé)', () => {
  it('isReviewAccountEnabled() false si env pa defini', () => {
    expect(isReviewAccountEnabled()).toBe(false);
  });

  it('isReviewAccountEmail() reste true même switch "false" — check PERMANENT, voir describe plus bas', () => {
    setEnv('false', 'reviewer@example.com,recipient@example.com');
    expect(isReviewAccountEmail('reviewer@example.com')).toBe(true);
  });

  it('isReviewAccountLoginBypassActive() false si switch la absan', () => {
    setEnv(undefined, 'reviewer@example.com,recipient@example.com', '123456');
    expect(isReviewAccountLoginBypassActive('reviewer@example.com')).toBe(false);
  });
});

describe('review-account.config — switch "true"', () => {
  beforeEach(() => {
    setEnv('true', ' Reviewer@Example.com , Recipient@Example.com ', '123456');
  });

  it('isReviewAccountEmail() detekte imel yo, insansib a majiskil ak espas', () => {
    expect(isReviewAccountEmail('reviewer@example.com')).toBe(true);
    expect(isReviewAccountEmail('RECIPIENT@EXAMPLE.COM')).toBe(true);
  });

  it('isReviewAccountEmail() false pou yon email ki pa nan lis la', () => {
    expect(isReviewAccountEmail('random-user@example.com')).toBe(false);
  });

  it('getReviewAccountEmailA/B() retounen premye/dezyèm email, trim+lowercase', () => {
    expect(getReviewAccountEmailA()).toBe('reviewer@example.com');
    expect(getReviewAccountEmailB()).toBe('recipient@example.com');
  });

  it('isReviewAccountLoginBypassActive() true sèlman pou imel konfigire yo', () => {
    expect(isReviewAccountLoginBypassActive('reviewer@example.com')).toBe(true);
    expect(isReviewAccountLoginBypassActive('random-user@example.com')).toBe(false);
  });

  it('getReviewAccountOtpCode() retounen kòd fiks la', () => {
    expect(getReviewAccountOtpCode()).toBe('123456');
  });

  it('assertNotReviewAccount() throw 403 ak mesaj egzat pou yon email demo', () => {
    expect(() => assertNotReviewAccount('reviewer@example.com')).toThrow(REVIEW_ACCOUNT_BLOCKED_MESSAGE);
  });

  it('assertNotReviewAccount() pa throw pou yon email nòmal', () => {
    expect(() => assertNotReviewAccount('random-user@example.com')).not.toThrow();
  });

  it('assertDemoTransferAllowed() pa throw ant 2 kont demo yo (toulède sans)', () => {
    expect(() => assertDemoTransferAllowed('reviewer@example.com', 'recipient@example.com')).not.toThrow();
    expect(() => assertDemoTransferAllowed('recipient@example.com', 'reviewer@example.com')).not.toThrow();
  });

  it('assertDemoTransferAllowed() throw demo→reyèl', () => {
    expect(() => assertDemoTransferAllowed('reviewer@example.com', 'random-user@example.com')).toThrow(
      REVIEW_ACCOUNT_BLOCKED_MESSAGE,
    );
  });

  it('assertDemoTransferAllowed() throw reyèl→demo', () => {
    expect(() => assertDemoTransferAllowed('random-user@example.com', 'reviewer@example.com')).toThrow(
      REVIEW_ACCOUNT_BLOCKED_MESSAGE,
    );
  });

  it('assertDemoTransferAllowed() pa throw ant 2 itilizatè nòmal (konpòtman inchanje)', () => {
    expect(() => assertDemoTransferAllowed('a@example.com', 'b@example.com')).not.toThrow();
  });

  it('isDemoToDemoTransfer() true sèlman si toulède nan lis la', () => {
    expect(isDemoToDemoTransfer('reviewer@example.com', 'recipient@example.com')).toBe(true);
    expect(isDemoToDemoTransfer('reviewer@example.com', 'random-user@example.com')).toBe(false);
    expect(isDemoToDemoTransfer('random-user@example.com', 'random2@example.com')).toBe(false);
  });
});

describe('review-account.config — registre pèmanan (isReviewAccountEmail) endepandan de switch la', () => {
  it('rete true menm si switch la koupe apre — pwoteksyon pèmanan pou idantite rezève a', () => {
    setEnv('true', 'reviewer@example.com,recipient@example.com', '123456');
    expect(isReviewAccountEmail('reviewer@example.com')).toBe(true);

    setEnv('false', 'reviewer@example.com,recipient@example.com', '123456');
    expect(isReviewAccountEmail('reviewer@example.com')).toBe(true);
    // men bypass OTP la koupe
    expect(isReviewAccountLoginBypassActive('reviewer@example.com')).toBe(false);
  });
});
