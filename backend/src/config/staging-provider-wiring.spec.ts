// Confirms the chokepoints wired in task 5 actually stop real HTTP calls in
// staging (and still make them outside staging — zero regression) for one
// representative call site per provider. Deeper per-endpoint mock shaping
// is covered by provider-mock.spec.ts.
import axios from 'axios';

jest.mock('axios');

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_FETCH = global.fetch;

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  global.fetch = ORIGINAL_FETCH;
  // Deliberately no jest.resetModules() here — these services read
  // isStaging() dynamically at call time, and resetting modules would
  // desync the auto-mocked `axios` singleton imported above from the one a
  // freshly re-required service would bind to.
  jest.clearAllMocks();
});

function setStaging(on: boolean) {
  if (on) process.env.APP_ENV = 'staging';
  else delete process.env.APP_ENV;
}

beforeEach(() => {
  // Deterministic mocks for this file — failure-rate randomness is covered
  // separately in provider-mock.spec.ts.
  process.env.STAGING_MOCK_FAILURE_RATE = '0';
});

describe('StroWallet (strowallet.service.ts nfcGet chokepoint)', () => {
  it('never calls axios.get in staging; calls it otherwise', async () => {
    (axios.get as jest.Mock).mockResolvedValue({ data: { success: true, response: {} } });
    const { StrowalletService } = require('../strowallet/strowallet.service');
    const config = { get: () => undefined } as any;
    const service = new StrowalletService({} as any, config, {} as any, {} as any, {} as any);

    setStaging(true);
    await service.fetchCardDetailByCardId('CARD-1');
    expect(axios.get).not.toHaveBeenCalled();

    setStaging(false);
    await service.fetchCardDetailByCardId('CARD-1');
    expect(axios.get).toHaveBeenCalledTimes(1);
  });
});

describe('BSICards (bsicards.service.ts bsicardsPost chokepoint)', () => {
  it('never calls axios.post in staging; calls it otherwise', async () => {
    (axios.post as jest.Mock).mockResolvedValue({ data: { success: true, response: {} } });
    const { BSICardsService } = require('../bsicards/bsicards.service');
    const service = new BSICardsService({} as any, { get: () => undefined } as any);

    setStaging(true);
    await service.getAllCards('user@example.com');
    expect(axios.post).not.toHaveBeenCalled();

    setStaging(false);
    await service.getAllCards('user@example.com');
    expect(axios.post).toHaveBeenCalledTimes(1);
  });
});

describe('MonCashConnect (moncashconnect.service.ts checkPaymentStatus)', () => {
  it('never calls fetch in staging; calls it otherwise', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'COMPLETED' }) });
    global.fetch = fetchMock as any;
    const { MonCashConnectService } = require('../payments/moncashconnect.service');
    const service = new MonCashConnectService({} as any, {} as any);

    setStaging(true);
    await service.checkPaymentStatus('ref-1');
    expect(fetchMock).not.toHaveBeenCalled();

    setStaging(false);
    await service.checkPaymentStatus('ref-1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
