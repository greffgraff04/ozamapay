import axios from 'axios';
import { BSICardsMastercardEuroService } from './bsicards-mastercard-euro.service';

jest.mock('axios');

function buildService(): BSICardsMastercardEuroService {
  const fakeConfig = { get: () => undefined } as any;
  return new BSICardsMastercardEuroService({} as any, fakeConfig);
}

describe('BSICardsMastercardEuroService.bsicardsPost — validasyon siksè estrik', () => {
  const originalAppEnv = process.env.APP_ENV;

  beforeEach(() => {
    // Fòse chemen axios reyèl la (pa mock staging) — se egzakteman chemen sa
    // nou ap teste a.
    delete process.env.APP_ENV;
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env.APP_ENV = originalAppEnv;
  });

  it('rejte yon repons HTML "Account Suspended" (ekwiv. pàn ebèjman BSICards) kòm echèk', async () => {
    (axios.post as jest.Mock).mockResolvedValue({ data: '<html><title>Account Suspended</title></html>' });
    const service = buildService();

    await expect((service as any).bsicardsPost('mastercard-euro/get-card', {})).rejects.toThrow(
      'Nou rankontre yon pwoblèm teknik',
    );
  });

  it('rejte yon JSON valab ki pa gen ni success ni status eksplisit', async () => {
    (axios.post as jest.Mock).mockResolvedValue({ data: { response: { cardid: 'ABC123' } } });
    const service = buildService();

    await expect((service as any).bsicardsPost('mastercard-euro/fund-card', {})).rejects.toThrow(
      'Nou rankontre yon pwoblèm teknik',
    );
  });

  it('rejte si axios echwe (timeout/ECONNABORTED) — chemen echèk ki te la deja', async () => {
    const timeoutError: any = new Error('timeout of 10000ms exceeded');
    timeoutError.code = 'ECONNABORTED';
    (axios.post as jest.Mock).mockRejectedValue(timeoutError);
    const service = buildService();

    await expect((service as any).bsicardsPost('mastercard-euro/fund-card', {})).rejects.toThrow(
      'Nou rankontre yon pwoblèm teknik',
    );
  });

  it('aksepte yon siksè nòmal (JSON ak success:true) epi retounen done a', async () => {
    const payload = { success: true, response: { cardid: 'ABC123' } };
    (axios.post as jest.Mock).mockResolvedValue({ data: payload });
    const service = buildService();

    const result = await (service as any).bsicardsPost('mastercard-euro/create-card', {});
    expect(result).toEqual(payload);
  });

  it('aksepte yon siksè nòmal ki itilize status:true olye success:true', async () => {
    const payload = { status: true, response: { cardid: 'ABC123' } };
    (axios.post as jest.Mock).mockResolvedValue({ data: payload });
    const service = buildService();

    const result = await (service as any).bsicardsPost('mastercard-euro/create-card', {});
    expect(result).toEqual(payload);
  });
});
