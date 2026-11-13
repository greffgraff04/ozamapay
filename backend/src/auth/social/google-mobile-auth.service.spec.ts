import { OAuth2Client } from 'google-auth-library';
import { GoogleMobileAuthService } from './google-mobile-auth.service';

jest.mock('google-auth-library');

const ORIGINAL_ENV = { ...process.env };

function setEnv(overrides: Record<string, string | undefined>) {
  process.env = { ...ORIGINAL_ENV, ...overrides };
}

function mockVerifyIdToken(result: 'throw' | { payload: any }) {
  (OAuth2Client as unknown as jest.Mock).mockImplementation(() => ({
    verifyIdToken: jest.fn(async () => {
      if (result === 'throw') throw new Error('Token used too late');
      return { getPayload: () => result.payload };
    }),
  }));
}

describe('GoogleMobileAuthService.verifyIdToken', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.clearAllMocks();
  });

  it('rejte si GOOGLE_MOBILE_CLIENT_IDS pa konfigire', async () => {
    setEnv({ GOOGLE_MOBILE_CLIENT_IDS: '' });
    mockVerifyIdToken({ payload: {} });
    const service = new GoogleMobileAuthService();
    await expect(service.verifyIdToken('any-token')).rejects.toMatchObject({
      message: expect.stringContaining('Google'),
    });
  });

  it('rejte si siyati envalid oswa mauvais aud (verifyIdToken jete)', async () => {
    setEnv({ GOOGLE_MOBILE_CLIENT_IDS: 'ios-client-id,android-client-id,web-client-id' });
    mockVerifyIdToken('throw');
    const service = new GoogleMobileAuthService();
    await expect(service.verifyIdToken('bad-token')).rejects.toMatchObject({
      message: expect.stringContaining('envalid'),
    });
  });

  it('rejte si token ekspire (verifyIdToken jete)', async () => {
    setEnv({ GOOGLE_MOBILE_CLIENT_IDS: 'ios-client-id' });
    mockVerifyIdToken('throw');
    const service = new GoogleMobileAuthService();
    await expect(service.verifyIdToken('expired-token')).rejects.toMatchObject({
      message: expect.stringContaining('ekspire'),
    });
  });

  it('rejte si email_verified=false', async () => {
    setEnv({ GOOGLE_MOBILE_CLIENT_IDS: 'ios-client-id' });
    mockVerifyIdToken({
      payload: { sub: 'google-sub-1', email: 'client@example.com', email_verified: false },
    });
    const service = new GoogleMobileAuthService();
    await expect(service.verifyIdToken('unverified-email-token')).rejects.toMatchObject({
      message: expect.stringContaining('verifye'),
    });
  });

  it('retounen idantite a si token valid ak email_verified=true', async () => {
    setEnv({ GOOGLE_MOBILE_CLIENT_IDS: 'ios-client-id,android-client-id' });
    mockVerifyIdToken({
      payload: {
        sub: 'google-sub-2',
        email: 'Client@Example.com',
        email_verified: true,
        given_name: 'Jean',
        family_name: 'Pierre',
      },
    });
    const service = new GoogleMobileAuthService();
    const identity = await service.verifyIdToken('good-token');
    expect(identity).toEqual({
      sub: 'google-sub-2',
      email: 'client@example.com',
      emailVerified: true,
      firstName: 'Jean',
      lastName: 'Pierre',
    });
  });
});
