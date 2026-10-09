import { ReloadlyAuthService } from './reloadly-auth.service';

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_FETCH = global.fetch;

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  global.fetch = ORIGINAL_FETCH;
  jest.clearAllMocks();
});

describe('ReloadlyAuthService.getToken — staging fail-fast, prod unchanged', () => {
  it('staging: throws locally without calling fetch when credentials are missing', async () => {
    process.env.APP_ENV = 'staging';
    delete process.env.RELOADLY_CLIENT_ID;
    delete process.env.RELOADLY_CLIENT_SECRET;
    const fetchMock = jest.fn();
    global.fetch = fetchMock as any;

    const service = new ReloadlyAuthService();
    await expect(service.getToken('https://giftcards.reloadly.com')).rejects.toThrow(/Reloadly/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('staging: proceeds to the real call when both credentials are present', async () => {
    process.env.APP_ENV = 'staging';
    process.env.RELOADLY_CLIENT_ID = 'sandbox-id';
    process.env.RELOADLY_CLIENT_SECRET = 'sandbox-secret';
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'tok', expires_in: 3600 }),
    });
    global.fetch = fetchMock as any;

    const service = new ReloadlyAuthService();
    const token = await service.getToken('https://giftcards.reloadly.com');
    expect(token).toBe('tok');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('prod-identical: still attempts the real call even without credentials when APP_ENV is unset', async () => {
    delete process.env.APP_ENV;
    delete process.env.RELOADLY_CLIENT_ID;
    delete process.env.RELOADLY_CLIENT_SECRET;
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'tok', expires_in: 3600 }),
    });
    global.fetch = fetchMock as any;

    const service = new ReloadlyAuthService();
    await service.getToken('https://giftcards.reloadly.com');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
