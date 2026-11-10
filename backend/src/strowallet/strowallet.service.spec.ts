import axios from 'axios';
import { StrowalletService } from './strowallet.service';

jest.mock('axios');

function buildService(): StrowalletService {
  const fakeConfig = { get: () => undefined } as any;
  return new StrowalletService({} as any, fakeConfig, {} as any, {} as any, {} as any);
}

describe('StrowalletService.sanitizeCityForProvider — koupe city a 20 karaktè', () => {
  const service = buildService();

  it('koupe yon city 22 karaktè a 20 karaktè (reprodiksyon rejè live jundecilien77)', () => {
    const city = 'A'.repeat(22);
    const { city: result } = service.sanitizeCityForProvider(city, 'Ruelle A');
    expect(result.length).toBe(20);
    expect(result).toBe('A'.repeat(20));
  });

  it('pa touche yon city ki deja ≤ 20 karaktè', () => {
    const { city } = service.sanitizeCityForProvider('Port-au-Prince', 'Ruelle A');
    expect(city).toBe('Port-au-Prince');
  });

  it('trim espas anvan/apre city a anvan koupe', () => {
    const { city } = service.sanitizeCityForProvider('  Les Gonaïves  ', 'Ruelle B');
    expect(city).toBe('Les Gonaïves');
  });

  it('kenbe lojik egzistan: retire chif nan city, ajoute l nan line1', () => {
    const { city, line1 } = service.sanitizeCityForProvider('Delmas 71', 'Ruelle C');
    expect(city).toBe('Delmas');
    expect(line1).toBe('Ruelle C, Delmas 71');
  });

  it('koupe city a 20 karaktè menm apre retire chif yo', () => {
    const longCity = `${'A'.repeat(25)} 71`; // gen chif + pi long pase 20 apre netwayaj
    const { city } = service.sanitizeCityForProvider(longCity, 'Ruelle D');
    expect(city).toBe('A'.repeat(20));
  });
});

describe('StrowalletService.sanitizeNameForProvider — retire ponktiyasyon', () => {
  const service = buildService();

  it('retire pwen nan "E.Juste" (reprodiksyon rejè live justeemerson@gmail.com)', () => {
    expect(service.sanitizeNameForProvider('E.Juste')).toBe('EJuste');
  });

  it('retire vigil, apostwòf ak lòt senbòl', () => {
    expect(service.sanitizeNameForProvider("D'Angelo, Jr.")).toBe('DAngelo Jr');
  });

  it('kenbe espas ant 2 mo', () => {
    expect(service.sanitizeNameForProvider('JEAN PIERRE')).toBe('JEAN PIERRE');
  });

  it('kenbe tirè', () => {
    expect(service.sanitizeNameForProvider('ST-FLEUR')).toBe('ST-FLEUR');
  });

  it('kenbe aksan san chanje yo', () => {
    expect(service.sanitizeNameForProvider('Décilien Ëlodie')).toBe('Décilien Ëlodie');
  });

  it('kolapse espas miltip ki rete apre retire senbòl yo, epi trim', () => {
    // "Jean , , Pierre" → vigil yo retire, kite 3 espas ant "Jean" ak "Pierre"
    expect(service.sanitizeNameForProvider('Jean , , Pierre')).toBe('Jean Pierre');
  });

  it('trim espas bò kòmanse/fini apre netwayaj', () => {
    expect(service.sanitizeNameForProvider('  Jean   Pierre  ')).toBe('Jean Pierre');
  });
});

describe('StrowalletService.calculateAgeYears', () => {
  const service = buildService();

  it('kalkile laj kòrèkteman lè fèt deja pase ane sa a', () => {
    const now = new Date();
    const dob = new Date(now.getFullYear() - 20, 0, 1); // 1 janvye, 20 an pase
    expect(service.calculateAgeYears(dob)).toBe(20);
  });

  it('kalkile laj kòrèkteman lè fèt poko rive ane sa a (pa gen 18 an toujou)', () => {
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
    const dob = new Date(tomorrow.getFullYear() - 18, tomorrow.getMonth(), tomorrow.getDate());
    expect(service.calculateAgeYears(dob)).toBe(17);
  });

  it('kliyan 6 an (reprodiksyon live ronaldsaintlouis543@gmail.com) dwe gen laj < 18', () => {
    const now = new Date();
    const dob = new Date(now.getFullYear() - 6, now.getMonth(), now.getDate());
    expect(service.calculateAgeYears(dob)).toBe(6);
  });

  it('kliyan 16 an (reprodiksyon live romaincamberly183@gmail.com) dwe gen laj < 18', () => {
    const now = new Date();
    const dob = new Date(now.getFullYear() - 16, now.getMonth(), now.getDate());
    expect(service.calculateAgeYears(dob)).toBe(16);
  });

  it('retounen NaN pou yon dat nesans envalid', () => {
    expect(Number.isNaN(service.calculateAgeYears('pa-yon-dat'))).toBe(true);
  });
});

describe('StrowalletService.translateCardkycRejectionMessage — mesaj kliyan an', () => {
  const service = buildService();
  const NEEDS_SUPPORT = 'Nou pa ka kreye kat la ak enfòmasyon sa yo. Tanpri kontakte sipò OZAMAPAY, nou pral ede w korije l.';

  it('tradui "at least 18 years old"', () => {
    const msg = service.translateCardkycRejectionMessage('Customer must be at least 18 years old');
    expect(msg).toBe('Ou dwe gen omwen 18 an pou kreye yon kat.');
  });

  it('tradui "English letters only" → mesaj sipò (kliyan pa ka korije non li nan pwofil)', () => {
    const msg = service.translateCardkycRejectionMessage('last_name must use English letters only');
    expect(msg).toBe(NEEDS_SUPPORT);
  });

  it('tradui "Postal code is required" → mesaj sipò, menm si kliyan an gen yon zip ki pa vid', () => {
    const detail = JSON.stringify({ code: 'BAD_REQUEST', message: 'Validation failed', details: { postal_code: 'Postal code is required' } });
    const msg = service.translateCardkycRejectionMessage(detail);
    expect(msg).toBe(NEEDS_SUPPORT);
    expect(msg).not.toMatch(/ajoute/i);
  });

  it('tradui "already matches this phone under a different email"', () => {
    const msg = service.translateCardkycRejectionMessage(
      'an existing customer already matches this phone under a different email; re-submit with customer_id=xyz',
    );
    expect(msg).toBe('Nimewo telefòn sa a deja asosye ak yon lòt kont. Kontakte sipò OZAMAPAY.');
  });

  it('retounen null pou nenpòt lòt mesaj (pa gen tradiksyon defo ankò)', () => {
    const msg = service.translateCardkycRejectionMessage('cardkyc status="rejected", pa "approved"');
    expect(msg).toBeNull();
  });

  it('retounen null pou yon detail ki pa gen fòma ni string ni objè rekonèt', () => {
    expect(service.translateCardkycRejectionMessage(undefined)).toBeNull();
  });

  it('pa janm mansyone non founisè a nan okenn mesaj tradui', () => {
    const allDetails = [
      'Customer must be at least 18 years old',
      'last_name must use English letters only',
      'Postal code is required',
      'an existing customer already matches this phone under a different email',
    ];
    for (const d of allDetails) {
      const msg = service.translateCardkycRejectionMessage(d);
      expect(msg?.toLowerCase()).not.toMatch(/strowallet|ziiropay/);
    }
  });
});

// ─── Tès entegrasyon: createAndFundCard() ───────────────────────────────────
// Wire manyèlman (menm apwòch ak staging-provider-wiring.spec.ts) — pa gen
// NestJS TestingModule, sèlman fo depandans ki bay sa fonksyon an bezwen pou
// rive nan pwen presi n ap teste a.
describe('StrowalletService.createAndFundCard — entegrasyon', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.clearAllMocks();
  });

  function buildAdultKyc(overrides: any = {}) {
    const now = new Date();
    return {
      firstName: 'Jean',
      lastName: 'Pierre',
      dateOfBirth: new Date(now.getFullYear() - 25, 0, 1),
      phoneNumber: '50912345678',
      idType: 'PASSPORT',
      idNumber: 'AB123456',
      idImage: 'https://example.com/id.jpg',
      userPhoto: 'https://example.com/photo.jpg',
      line1: 'Ruelle Egzanp 12',
      city: 'Port-au-Prince',
      state: 'Ouest',
      zipCode: '6110',
      country: 'HT',
      status: 'APPROVED',
      ...overrides,
    };
  }

  function buildUser(kycOverrides: any = {}, userOverrides: any = {}) {
    return {
      id: 'user-1',
      email: 'client@example.com',
      name: 'Jean Pierre',
      phone: null,
      wallet: { id: 'wallet-1', balance: 1_000_000 },
      kyc: buildAdultKyc(kycOverrides),
      ...userOverrides,
    };
  }

  function buildFakePrisma(user: any) {
    const txMock = {
      wallet: { update: jest.fn(async () => ({})) },
      transaction: { create: jest.fn(async () => ({})) },
      virtualCard: { create: jest.fn(async ({ data }: any) => ({ id: 'card-row-1', ...data })) },
    };
    return {
      virtualCard: { findFirst: jest.fn(async () => null) },
      user: { findUnique: jest.fn(async () => user) },
      rate: { findUnique: jest.fn(async () => ({ value: 130 })) },
      cardCreationFailure: {
        create: jest.fn(async ({ data }: any) => data),
        count: jest.fn(async () => 1), // < 2 → pa deklanche alèt email
      },
      $transaction: jest.fn(async (cb: any) => cb(txMock)),
      _txMock: txMock,
    };
  }

  function buildService(fakePrisma: any): StrowalletService {
    const fakeConfig = { get: () => undefined } as any;
    return new StrowalletService(fakePrisma as any, fakeConfig, {} as any, {} as any, {} as any);
  }

  beforeEach(() => {
    delete process.env.APP_ENV; // pa staging → chemen axios mocke a itilize
    (axios.get as jest.Mock).mockResolvedValue({ data: Buffer.from('fake-id-image-bytes') });
  });

  it('kenbe egzakteman erè orijinal la (menm objè, ak strowalletDetail li) si cardkyc rejte ak yon mesaj ki pa matche okenn tradiksyon', async () => {
    const user = buildUser();
    const fakePrisma = buildFakePrisma(user);
    const service = buildService(fakePrisma);

    (axios.post as jest.Mock).mockRejectedValueOnce({
      response: {
        data: { success: false, message: 'Yon glitch total diferan, pa nan lis tradiksyon yo', status: 'rejected' },
      },
    });

    let caught: any;
    try {
      await service.createAndFundCard('user-1', 3);
    } catch (err) {
      caught = err;
    }

    // Mesaj la rete jenerik (menm konpòtman ak anvan, strowalletFailure() te
    // deja mete l konsa) — men pwèv REYÈL ke se ERÈ ORIJINAL la (pa yon
    // nouvo BadRequestException konstwi nan catch la) se prezans
    // strowalletDetail a, ki gen rezon brit founisè a.
    expect(caught.message).toBe('Nou rankontre yon pwoblèm teknik. Tanpri eseye ankò pita oswa kontakte sipò OZAMAPAY.');
    expect(caught.strowalletDetail).toContain('Yon glitch total diferan');

    // CardCreationFailure toujou anrejistre mesaj konplè a, san chanjman.
    expect(fakePrisma.cardCreationFailure.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          errorMessage: expect.stringContaining('Yon glitch total diferan'),
        }),
      }),
    );
  });

  it('tradui mesaj lè cardkyc rejte ak yon rezon idantifye (ex: laj)', async () => {
    const user = buildUser();
    const fakePrisma = buildFakePrisma(user);
    const service = buildService(fakePrisma);

    (axios.post as jest.Mock).mockRejectedValueOnce({
      response: { data: { success: false, message: 'Customer must be at least 18 years old', status: 'rejected' } },
    });

    await expect(service.createAndFundCard('user-1', 3)).rejects.toMatchObject({
      message: 'Ou dwe gen omwen 18 an pou kreye yon kat.',
    });
  });

  it('pa krache (TypeError) si Kyc.state null — voye state vid bay founisè a', async () => {
    const user = buildUser({ state: null });
    const fakePrisma = buildFakePrisma(user);
    const service = buildService(fakePrisma);

    (axios.post as jest.Mock)
      .mockResolvedValueOnce({ data: { success: true, response: { customer_id: 'cust-1', status: 'approved' } } })
      .mockResolvedValueOnce({ data: { success: true, response: { card_id: 'card-xyz' } } });

    await expect(service.createAndFundCard('user-1', 3)).resolves.toMatchObject({
      message: expect.stringContaining('siksè'),
    });

    const cardkycCallArgs = (axios.post as jest.Mock).mock.calls[0];
    const sentPayload = cardkycCallArgs[2]?.params;
    expect(sentPayload.state).toBe('');
  });

  it('blòk lokal: laj 16 an (pa 18) → mesaj "18 an", san apèl founisè', async () => {
    const now = new Date();
    const user = buildUser({ dateOfBirth: new Date(now.getFullYear() - 16, now.getMonth(), now.getDate()) });
    const fakePrisma = buildFakePrisma(user);
    const service = buildService(fakePrisma);

    await expect(service.createAndFundCard('user-1', 3)).rejects.toMatchObject({
      message: 'Ou dwe gen omwen 18 an pou kreye yon kat.',
    });
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('blòk lokal: dat nesans envalid (NaN) → mesaj "dat nesans", PA mesaj "18 an"', async () => {
    const user = buildUser({ dateOfBirth: 'pa-yon-dat' });
    const fakePrisma = buildFakePrisma(user);
    const service = buildService(fakePrisma);

    await expect(service.createAndFundCard('user-1', 3)).rejects.toMatchObject({
      message: 'Dat nesans ou a pa parèt kòrèk. Tanpri kontakte sipò OZAMAPAY.',
    });
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('blòk lokal: zip vid → mesaj sipò (pa "ajoute l nan pwofil ou")', async () => {
    const user = buildUser({ zipCode: '' });
    const fakePrisma = buildFakePrisma(user);
    const service = buildService(fakePrisma);

    await expect(service.createAndFundCard('user-1', 3)).rejects.toMatchObject({
      message: 'Nou pa ka kreye kat la ak enfòmasyon sa yo. Tanpri kontakte sipò OZAMAPAY, nou pral ede w korije l.',
    });
    expect(axios.post).not.toHaveBeenCalled();
  });
});
