import axios from 'axios';
import * as jwt from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';
import { AppleAuthService } from './apple-auth.service';

jest.mock('axios');
jest.mock('jsonwebtoken');
jest.mock('jwks-rsa');

const ORIGINAL_ENV = { ...process.env };

function setEnv(overrides: Record<string, string | undefined>) {
  process.env = { ...ORIGINAL_ENV, ...overrides };
}

function mockJwks(publicKey: string | Error = 'fake-public-key') {
  (JwksClient as unknown as jest.Mock).mockImplementation(() => ({
    getSigningKey: jest.fn(async (kid: string) => {
      if (publicKey instanceof Error) throw publicKey;
      return { getPublicKey: () => publicKey };
    }),
  }));
}

describe('AppleAuthService.verifyIdentityToken', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.clearAllMocks();
  });

  it('rejte si APPLE_CLIENT_IDS pa konfigire', async () => {
    setEnv({ APPLE_CLIENT_IDS: '' });
    mockJwks();
    const service = new AppleAuthService();
    await expect(service.verifyIdentityToken('any-token')).rejects.toMatchObject({
      message: expect.stringContaining('Apple'),
    });
  });

  it('rejte si token pa gen "kid" nan header la (token malfòme)', async () => {
    setEnv({ APPLE_CLIENT_IDS: 'com.ozamapay.app' });
    mockJwks();
    (jwt.decode as jest.Mock).mockReturnValue({ header: {}, payload: {} });
    const service = new AppleAuthService();
    await expect(service.verifyIdentityToken('bad-token')).rejects.toMatchObject({
      message: expect.stringContaining('Apple'),
    });
  });

  it('rejte si siyati envalid (jwt.verify jete)', async () => {
    setEnv({ APPLE_CLIENT_IDS: 'com.ozamapay.app' });
    mockJwks();
    (jwt.decode as jest.Mock).mockReturnValue({ header: { kid: 'key-1' }, payload: {} });
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('invalid signature');
    });
    const service = new AppleAuthService();
    await expect(service.verifyIdentityToken('bad-sig-token')).rejects.toMatchObject({
      message: expect.stringContaining('Apple'),
    });
  });

  it('rejte si mauvais aud (jwt.verify jete JsonWebTokenError pou audience)', async () => {
    setEnv({ APPLE_CLIENT_IDS: 'com.ozamapay.app' });
    mockJwks();
    (jwt.decode as jest.Mock).mockReturnValue({ header: { kid: 'key-1' }, payload: {} });
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('jwt audience invalid');
    });
    const service = new AppleAuthService();
    await expect(service.verifyIdentityToken('wrong-aud-token')).rejects.toMatchObject({
      message: expect.stringContaining('Apple'),
    });
  });

  it('rejte si token ekspire (jwt.verify jete TokenExpiredError)', async () => {
    setEnv({ APPLE_CLIENT_IDS: 'com.ozamapay.app' });
    mockJwks();
    (jwt.decode as jest.Mock).mockReturnValue({ header: { kid: 'key-1' }, payload: {} });
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new jwt.TokenExpiredError('jwt expired', new Date());
    });
    const service = new AppleAuthService();
    await expect(service.verifyIdentityToken('expired-token')).rejects.toMatchObject({
      message: expect.stringContaining('ekspire'),
    });
  });

  it('retounen idantite a si token valid (email prezan, email_verified=true)', async () => {
    setEnv({ APPLE_CLIENT_IDS: 'com.ozamapay.app' });
    mockJwks();
    (jwt.decode as jest.Mock).mockReturnValue({ header: { kid: 'key-1' }, payload: {} });
    (jwt.verify as jest.Mock).mockReturnValue({
      sub: 'apple-sub-123',
      email: 'Client@Example.com',
      email_verified: 'true',
      is_private_email: 'false',
    });
    const service = new AppleAuthService();
    const identity = await service.verifyIdentityToken('good-token');
    expect(identity).toEqual({
      sub: 'apple-sub-123',
      email: 'client@example.com',
      emailVerified: true,
      isPrivateEmail: false,
    });
  });

  it('retounen emailVerified=false si email_verified absan/fo', async () => {
    setEnv({ APPLE_CLIENT_IDS: 'com.ozamapay.app' });
    mockJwks();
    (jwt.decode as jest.Mock).mockReturnValue({ header: { kid: 'key-1' }, payload: {} });
    (jwt.verify as jest.Mock).mockReturnValue({ sub: 'apple-sub-456' });
    const service = new AppleAuthService();
    const identity = await service.verifyIdentityToken('good-token-no-email');
    expect(identity.emailVerified).toBe(false);
    expect(identity.email).toBeUndefined();
  });
});

describe('AppleAuthService — revokasyon/echanj OPSYONÈL (credentials absan)', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.clearAllMocks();
  });

  it('hasRevocationCredentials() false si APPLE_TEAM_ID/KEY_ID/PRIVATE_KEY pa konplè', () => {
    setEnv({ APPLE_CLIENT_IDS: 'com.ozamapay.app', APPLE_TEAM_ID: 'TEAM1', APPLE_KEY_ID: undefined, APPLE_PRIVATE_KEY: undefined });
    const service = new AppleAuthService();
    expect(service.hasRevocationCredentials()).toBe(false);
  });

  it('exchangeAuthorizationCodeAndEncrypt() retounen null (pa jete) si kredansyal yo manke', async () => {
    setEnv({ APPLE_CLIENT_IDS: 'com.ozamapay.app' });
    const service = new AppleAuthService();
    const result = await service.exchangeAuthorizationCodeAndEncrypt('some-code');
    expect(result).toBeNull();
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('revokeRefreshToken() pa jete (no-op) si kredansyal yo manke', async () => {
    setEnv({ APPLE_CLIENT_IDS: 'com.ozamapay.app' });
    const service = new AppleAuthService();
    await expect(service.revokeRefreshToken('iv:tag:data')).resolves.toBeUndefined();
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('exchangeAuthorizationCodeAndEncrypt() retounen null si apèl Apple echwe (pa jete)', async () => {
    setEnv({
      APPLE_CLIENT_IDS: 'com.ozamapay.app',
      APPLE_TEAM_ID: 'TEAM1',
      APPLE_KEY_ID: 'KEY1',
      APPLE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nfake\\n-----END PRIVATE KEY-----',
    });
    (jwt.sign as jest.Mock).mockReturnValue('fake-client-secret');
    (axios.post as jest.Mock).mockRejectedValue({ response: { status: 400 } });
    const service = new AppleAuthService();
    const result = await service.exchangeAuthorizationCodeAndEncrypt('some-code');
    expect(result).toBeNull();
  });
});
