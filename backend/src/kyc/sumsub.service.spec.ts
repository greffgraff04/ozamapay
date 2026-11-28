import {
  SumsubService,
  signSumsubRequest,
  verifySumsubWebhookSignature,
  isSumsubEnabled,
  extractKycFieldsFromApplicant,
  extractImageRefs,
} from './sumsub.service';

// ImageKit factice par défaut (upload réussit). Les tests d'images le remplacent.
function imagekitOk() {
  return { uploadFile: jest.fn().mockResolvedValue('https://ik.imagekit.io/ozamapay/kyc/x.jpg') };
}

// MailService factice par défaut (envoi réussi).
function mailOk() {
  return { sendKycApproved: jest.fn().mockResolvedValue(undefined) };
}
import { createHmac } from 'crypto';

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_FETCH = global.fetch;

beforeEach(() => {
  process.env = {
    ...ORIGINAL_ENV,
    SUMSUB_ENABLED: 'true',
    SUMSUB_BASE_URL: 'https://api.sumsub.example',
    SUMSUB_APP_TOKEN: 'app-token-test',
    SUMSUB_SECRET_KEY: 'test-secret-key',
    SUMSUB_LEVEL_NAME: 'id-and-liveness',
    SUMSUB_WEBHOOK_SECRET: 'webhook-secret',
  };
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  global.fetch = ORIGINAL_FETCH;
  jest.clearAllMocks();
});

describe('signSumsubRequest (signature sortante)', () => {
  const ts = 1700000000;
  const method = 'POST';
  const path =
    '/resources/sdkIntegrations/levels/id-and-liveness/websdkLink?ttlInSecs=1800&externalUserId=user-123&lang=fr';
  const body = '{}';

  it('produit la bonne signature (vecteur golden)', () => {
    expect(signSumsubRequest('test-secret-key', ts, method, path, body)).toBe(
      'cbf8d7e0c012c6d406c0ef840db55569a787fca69eb2d70b980c4ceddabbf870',
    );
  });

  it('concatène ts+method+path+body dans cet ordre', () => {
    const expected = createHmac('sha256', 'test-secret-key')
      .update(`${ts}${method}${path}${body}`)
      .digest('hex');
    expect(signSumsubRequest('test-secret-key', ts, method, path, body)).toBe(expected);
  });

  it('change si un seul champ change', () => {
    const base = signSumsubRequest('test-secret-key', ts, method, path, body);
    expect(signSumsubRequest('test-secret-key', ts + 1, method, path, body)).not.toBe(base);
    expect(signSumsubRequest('test-secret-key', ts, 'GET', path, body)).not.toBe(base);
    expect(signSumsubRequest('test-secret-key', ts, method, path + 'x', body)).not.toBe(base);
    expect(signSumsubRequest('other-secret', ts, method, path, body)).not.toBe(base);
  });
});

describe('verifySumsubWebhookSignature (webhook entrant)', () => {
  const raw =
    '{"type":"applicantReviewed","applicantId":"abc","reviewResult":{"reviewAnswer":"GREEN"}}';
  const goodDigest =
    'ea09f2b120a64827751f6e48b8fffbbbd76c031eecb77e6005fae627350125ea';

  it('accepte une bonne signature', () => {
    expect(verifySumsubWebhookSignature('webhook-secret', raw, goodDigest)).toBe(true);
    expect(verifySumsubWebhookSignature('webhook-secret', Buffer.from(raw), goodDigest)).toBe(true);
  });

  it('rejette une mauvaise signature', () => {
    expect(verifySumsubWebhookSignature('webhook-secret', raw, 'deadbeef')).toBe(false);
    expect(
      verifySumsubWebhookSignature('mauvais-secret', raw, goodDigest),
    ).toBe(false);
  });

  it('rejette un corps altéré', () => {
    expect(
      verifySumsubWebhookSignature('webhook-secret', raw + ' ', goodDigest),
    ).toBe(false);
  });

  it('rejette secret ou digest manquant', () => {
    expect(verifySumsubWebhookSignature('', raw, goodDigest)).toBe(false);
    expect(verifySumsubWebhookSignature('webhook-secret', raw, '')).toBe(false);
  });
});

describe('isSumsubEnabled', () => {
  it('false par défaut (variable absente)', () => {
    delete process.env.SUMSUB_ENABLED;
    expect(isSumsubEnabled()).toBe(false);
  });

  it('true uniquement pour la chaîne "true"', () => {
    process.env.SUMSUB_ENABLED = 'true';
    expect(isSumsubEnabled()).toBe(true);
    process.env.SUMSUB_ENABLED = 'TRUE';
    expect(isSumsubEnabled()).toBe(false);
    process.env.SUMSUB_ENABLED = '1';
    expect(isSumsubEnabled()).toBe(false);
  });
});

describe('SumsubService.generateWebSdkLink', () => {
  it('POST signé vers le bon endpoint et retourne data.url', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://in.sumsub.com/websdk/abc123' }),
    });
    global.fetch = fetchMock as any;

    const service = new SumsubService({} as any, {} as any, {} as any);
    const url = await service.generateWebSdkLink('user-123', 'fr');

    expect(url).toBe('https://in.sumsub.com/websdk/abc123');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [calledUrl, opts] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe(
      'https://api.sumsub.example/resources/sdkIntegrations/levels/id-and-liveness/websdkLink?ttlInSecs=1800&externalUserId=user-123&lang=fr',
    );
    expect(opts.method).toBe('POST');
    expect(opts.body).toBe('{}');
    expect(opts.headers['X-App-Token']).toBe('app-token-test');
    expect(typeof opts.headers['X-App-Access-Ts']).toBe('string');
    // La signature envoyée doit correspondre au calcul attendu.
    const ts = Number(opts.headers['X-App-Access-Ts']);
    const path =
      '/resources/sdkIntegrations/levels/id-and-liveness/websdkLink?ttlInSecs=1800&externalUserId=user-123&lang=fr';
    expect(opts.headers['X-App-Access-Sig']).toBe(
      signSumsubRequest('test-secret-key', ts, 'POST', path, '{}'),
    );
  });

  it('jette si app token / secret manquant (aucune requête)', async () => {
    delete process.env.SUMSUB_APP_TOKEN;
    const fetchMock = jest.fn();
    global.fetch = fetchMock as any;

    const service = new SumsubService({} as any, {} as any, {} as any);
    await expect(service.generateWebSdkLink('user-123', 'fr')).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('jette si Sumsub répond non-ok', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'unauthorized',
    }) as any;

    const service = new SumsubService({} as any, {} as any, {} as any);
    await expect(service.generateWebSdkLink('user-123', 'fr')).rejects.toThrow();
  });
});

// ── Webhook applicantReviewed → mise à jour statut KYC ───────────────────────
// Fake Prisma en mémoire, miroir exact des appels de processApplicantReviewed.
function buildFakePrisma(seed: { user?: any; kyc?: any } = {}) {
  const state = {
    user: seed.user ? { ...seed.user } : null,
    kyc: seed.kyc ? { ...seed.kyc } : null,
  };
  return {
    state,
    user: {
      findUnique: jest.fn(async ({ where }: any) => {
        if (!state.user || state.user.id !== where.id) return null;
        return { ...state.user, kyc: state.kyc ? { ...state.kyc } : null };
      }),
      update: jest.fn(async ({ data }: any) => {
        state.user = { ...state.user, ...data };
        return state.user;
      }),
    },
    kyc: {
      update: jest.fn(async ({ data }: any) => {
        state.kyc = { ...state.kyc, ...data };
        return state.kyc;
      }),
      create: jest.fn(async ({ data }: any) => {
        state.kyc = { id: 'kyc-new', ...data };
        return state.kyc;
      }),
    },
  };
}

// Applicant Sumsub minimal pour un GET …/one réussi.
function fakeApplicant(overrides: any = {}) {
  return {
    info: {
      firstName: 'Jean',
      lastName: 'Baptiste',
      dob: '1990-05-14',
      country: 'HTI',
      phone: '+50933334444',
      idDocs: [{ idDocType: 'PASSPORT', number: 'HT123456' }],
      addresses: [{ street: '12 Rue Capois', town: 'Port-au-Prince', state: 'Ouest', postCode: 'HT6110' }],
    },
    ...overrides,
  };
}

function reviewedPayload(answer: string, extra: any = {}) {
  return {
    type: 'applicantReviewed',
    applicantId: 'appl-1',
    inspectionId: 'insp-1',
    levelName: 'id-and-liveness',
    reviewStatus: 'completed',
    externalUserId: 'user-1',
    reviewResult: { reviewAnswer: answer, ...extra },
  };
}

describe('SumsubService.processApplicantReviewed', () => {
  it('GREEN → marque Kyc APPROVED + reviewedAt, enregistre applicantId/level sur user', async () => {
    const prisma = buildFakePrisma({
      user: { id: 'user-1' },
      kyc: { id: 'kyc-1', status: 'PENDING' },
    });
    const service = new SumsubService(prisma as any, imagekitOk() as any, mailOk() as any);
    const out = await service.processApplicantReviewed(reviewedPayload('GREEN'));

    expect(out).toBe('approved');
    expect(prisma.kyc.update).toHaveBeenCalledTimes(1);
    expect(prisma.state.kyc.status).toBe('APPROVED');
    expect(prisma.state.kyc.reviewedAt).toBeInstanceOf(Date);
    expect(prisma.state.user.sumsubApplicantId).toBe('appl-1');
    expect(prisma.state.user.sumsubLevelName).toBe('id-and-liveness');
  });

  it('RED → marque REJECTED et enregistre reviewRejectType + rejectLabels', async () => {
    const prisma = buildFakePrisma({
      user: { id: 'user-1' },
      kyc: { id: 'kyc-1', status: 'PENDING' },
    });
    const service = new SumsubService(prisma as any, imagekitOk() as any, mailOk() as any);
    const out = await service.processApplicantReviewed(
      reviewedPayload('RED', { reviewRejectType: 'FINAL', rejectLabels: ['SELFIE_MISMATCH', 'ID_BLURRY'] }),
    );

    expect(out).toBe('rejected');
    expect(prisma.state.kyc.status).toBe('REJECTED');
    expect(prisma.state.kyc.sumsubReviewRejectType).toBe('FINAL');
    expect(prisma.state.kyc.sumsubRejectLabels).toEqual(['SELFIE_MISMATCH', 'ID_BLURRY']);
  });

  it('utilisateur introuvable → aucune écriture, résultat user_not_found', async () => {
    const prisma = buildFakePrisma({ user: null, kyc: null });
    const service = new SumsubService(prisma as any, imagekitOk() as any, mailOk() as any);
    const out = await service.processApplicantReviewed(reviewedPayload('GREEN'));

    expect(out).toBe('user_not_found');
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.kyc.update).not.toHaveBeenCalled();
  });

  it('doublon (même applicantId + reviewStatus déjà traité) → pas de réécriture', async () => {
    const prisma = buildFakePrisma({
      user: {
        id: 'user-1',
        sumsubApplicantId: 'appl-1',
        sumsubReviewStatus: 'completed',
      },
      kyc: { id: 'kyc-1', status: 'PENDING' },
    });
    const service = new SumsubService(prisma as any, imagekitOk() as any, mailOk() as any);
    const out = await service.processApplicantReviewed(reviewedPayload('GREEN'));

    expect(out).toBe('duplicate');
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.kyc.update).not.toHaveBeenCalled();
    expect(prisma.state.kyc.status).toBe('PENDING');
  });

  it('KYC déjà APPROVED (ancien flux) → GREEN ne réécrit pas', async () => {
    const prisma = buildFakePrisma({
      user: { id: 'user-1' },
      kyc: { id: 'kyc-1', status: 'APPROVED', reviewedAt: new Date('2026-01-01') },
    });
    const service = new SumsubService(prisma as any, imagekitOk() as any, mailOk() as any);
    const out = await service.processApplicantReviewed(reviewedPayload('GREEN'));

    expect(out).toBe('already_approved');
    expect(prisma.kyc.update).not.toHaveBeenCalled();
    expect(prisma.state.kyc.status).toBe('APPROVED');
  });

  it('KYC déjà APPROVED → un RED Sumsub NE l’écrase JAMAIS', async () => {
    const prisma = buildFakePrisma({
      user: { id: 'user-1' },
      kyc: { id: 'kyc-1', status: 'APPROVED' },
    });
    const service = new SumsubService(prisma as any, imagekitOk() as any, mailOk() as any);
    const out = await service.processApplicantReviewed(reviewedPayload('RED', { reviewRejectType: 'FINAL' }));

    expect(out).toBe('already_approved');
    expect(prisma.kyc.update).not.toHaveBeenCalled();
    expect(prisma.state.kyc.status).toBe('APPROVED');
  });

  it('GREEN sans ligne Kyc → récupère l’applicant Sumsub et CRÉE un Kyc APPROVED', async () => {
    const prisma = buildFakePrisma({ user: { id: 'user-1' }, kyc: null });
    const service = new SumsubService(prisma as any, imagekitOk() as any, mailOk() as any);
    jest.spyOn(service, 'getApplicant').mockResolvedValue(fakeApplicant());

    const out = await service.processApplicantReviewed(reviewedPayload('GREEN'));

    expect(out).toBe('created_approved');
    expect(service.getApplicant).toHaveBeenCalledWith('appl-1');
    expect(prisma.kyc.create).toHaveBeenCalledTimes(1);
    expect(prisma.state.kyc.status).toBe('APPROVED');
    expect(prisma.state.kyc.reviewedAt).toBeInstanceOf(Date);
    expect(prisma.state.kyc.userId).toBe('user-1');
    expect(prisma.state.kyc.firstName).toBe('Jean');
    expect(prisma.state.kyc.lastName).toBe('Baptiste');
    expect(prisma.state.kyc.idType).toBe('PASSPORT');
    expect(prisma.state.kyc.idNumber).toBe('HT123456');
    expect(prisma.state.kyc.country).toBe('HTI');
    expect(prisma.state.kyc.phoneNumber).toBe('+50933334444');
    expect(prisma.state.kyc.line1).toBe('12 Rue Capois');
    expect(prisma.state.kyc.city).toBe('Port-au-Prince');
    expect(prisma.state.kyc.zipCode).toBe('HT6110');
    expect(prisma.state.kyc.idImage).toBe('sumsub:appl-1');
    expect(prisma.state.kyc.userPhoto).toBe('sumsub:appl-1');
    // Marqueur d'idempotence écrit APRÈS la création.
    expect(prisma.state.user.sumsubReviewStatus).toBe('completed');
  });

  it('GREEN sans Kyc + échec getApplicant → aucune écriture, 200 pour retry', async () => {
    const prisma = buildFakePrisma({ user: { id: 'user-1' }, kyc: null });
    const service = new SumsubService(prisma as any, imagekitOk() as any, mailOk() as any);
    jest.spyOn(service, 'getApplicant').mockRejectedValue(new Error('503'));

    const out = await service.processApplicantReviewed(reviewedPayload('GREEN'));

    expect(out).toBe('sumsub_fetch_failed');
    expect(prisma.kyc.create).not.toHaveBeenCalled();
    // CRUCIAL : pas de marqueur d'idempotence → la relance Sumsub sera retraitée.
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.state.user.sumsubReviewStatus).toBeUndefined();
  });

  it('GREEN sans Kyc + applicant incomplet (identité manquante) → rien créé', async () => {
    const prisma = buildFakePrisma({ user: { id: 'user-1' }, kyc: null });
    const service = new SumsubService(prisma as any, imagekitOk() as any, mailOk() as any);
    jest.spyOn(service, 'getApplicant').mockResolvedValue({ info: { firstName: 'Jean' } });

    const out = await service.processApplicantReviewed(reviewedPayload('GREEN'));

    expect(out).toBe('incomplete_applicant_data');
    expect(prisma.kyc.create).not.toHaveBeenCalled();
  });
});

describe('extractKycFieldsFromApplicant', () => {
  it('mappe info + fixedInfo, images en référence sumsub', () => {
    const fields = extractKycFieldsFromApplicant(
      {
        info: {
          firstName: 'A',
          lastName: 'B',
          dob: '1988-01-02',
          country: 'USA',
          idDocs: [{ idDocType: 'ID_CARD', number: 'X9' }],
        },
        fixedInfo: {
          phone: '+1555',
          addresses: [{ street: 'Main St', town: 'NYC', state: 'NY', postCode: '10001' }],
        },
      },
      'appl-xyz',
    );
    expect(fields).not.toBeNull();
    expect(fields!.dateOfBirth).toBeInstanceOf(Date);
    expect(fields!.phoneNumber).toBe('+1555'); // repli fixedInfo
    expect(fields!.city).toBe('NYC');
    expect(fields!.idImage).toBe('sumsub:appl-xyz');
  });

  it('retourne null si identité/document essentiels manquants', () => {
    expect(extractKycFieldsFromApplicant({ info: { firstName: 'A' } }, 'x')).toBeNull();
    expect(
      extractKycFieldsFromApplicant(
        { info: { firstName: 'A', lastName: 'B', dob: '1990-01-01', country: 'HTI' } },
        'x',
      ),
    ).toBeNull(); // pas de document
  });

  it('retourne null si dob invalide', () => {
    expect(
      extractKycFieldsFromApplicant(
        {
          info: {
            firstName: 'A',
            lastName: 'B',
            dob: 'not-a-date',
            country: 'HTI',
            idDocs: [{ idDocType: 'ID', number: '1' }],
          },
        },
        'x',
      ),
    ).toBeNull();
  });
});

// Liste idDocs renvoyée par getApplicantIdDocs (endpoint dédié). Recto = ID_CARD
// (imageIds[0]=1001), selfie = SELFIE (imageIds[0]=2001).
function fakeIdDocs() {
  return [
    { idDocType: 'ID_CARD', country: 'HTI', imageIds: [1001, 1002] },
    { idDocType: 'SELFIE', imageIds: [2001] },
  ];
}

describe('extractImageRefs (liste idDocs)', () => {
  it('prend le RECTO (1er doc non-SELFIE) et le selfie', () => {
    expect(extractImageRefs(fakeIdDocs())).toEqual({
      idFrontImageId: '1001', selfieImageId: '2001',
    });
  });
  it('null quand aucun imageIds', () => {
    expect(extractImageRefs([{ idDocType: 'ID_CARD' }])).toEqual({
      idFrontImageId: null, selfieImageId: null,
    });
  });
  it('tolère un tableau vide / non-tableau', () => {
    expect(extractImageRefs([])).toEqual({ idFrontImageId: null, selfieImageId: null });
    expect(extractImageRefs(undefined as any)).toEqual({ idFrontImageId: null, selfieImageId: null });
  });
});

describe('SumsubService.processApplicantReviewed — images pièce/selfie', () => {
  it('images listées + téléchargées + uploadées → idImage/userPhoto = URL ImageKit', async () => {
    const prisma = buildFakePrisma({ user: { id: 'user-1' }, kyc: null });
    const imagekit = { uploadFile: jest.fn()
      .mockResolvedValueOnce('https://ik.imagekit.io/ozamapay/kyc/id.jpg')
      .mockResolvedValueOnce('https://ik.imagekit.io/ozamapay/kyc/selfie.jpg') };
    const service = new SumsubService(prisma as any, imagekit as any, mailOk() as any);
    jest.spyOn(service, 'getApplicant').mockResolvedValue(fakeApplicant());
    jest.spyOn(service, 'getApplicantIdDocs').mockResolvedValue(fakeIdDocs());
    const getImg = jest.spyOn(service, 'getIdDocImage').mockResolvedValue(Buffer.from('img'));

    const out = await service.processApplicantReviewed(reviewedPayload('GREEN'));

    expect(out).toBe('created_approved');
    // inspectionId vient du payload webhook ('insp-1'), imageId de la liste idDocs.
    expect(getImg).toHaveBeenNthCalledWith(1, 'insp-1', '1001'); // recto
    expect(getImg).toHaveBeenNthCalledWith(2, 'insp-1', '2001'); // selfie
    expect(imagekit.uploadFile).toHaveBeenCalledTimes(2);
    expect(prisma.state.kyc.idImage).toBe('https://ik.imagekit.io/ozamapay/kyc/id.jpg');
    expect(prisma.state.kyc.userPhoto).toBe('https://ik.imagekit.io/ozamapay/kyc/selfie.jpg');
  });

  it('échec téléchargement Sumsub → garde la référence sumsub:, ligne Kyc créée quand même', async () => {
    const prisma = buildFakePrisma({ user: { id: 'user-1' }, kyc: null });
    const imagekit = { uploadFile: jest.fn() };
    const service = new SumsubService(prisma as any, imagekit as any, mailOk() as any);
    jest.spyOn(service, 'getApplicant').mockResolvedValue(fakeApplicant());
    jest.spyOn(service, 'getApplicantIdDocs').mockResolvedValue(fakeIdDocs());
    jest.spyOn(service, 'getIdDocImage').mockRejectedValue(new Error('404'));

    const out = await service.processApplicantReviewed(reviewedPayload('GREEN'));

    expect(out).toBe('created_approved');
    expect(imagekit.uploadFile).not.toHaveBeenCalled();
    expect(prisma.state.kyc.idImage).toBe('sumsub:appl-1');
    expect(prisma.state.kyc.userPhoto).toBe('sumsub:appl-1');
  });

  it('échec ImageKit → garde la référence sumsub:, ligne Kyc créée quand même', async () => {
    const prisma = buildFakePrisma({ user: { id: 'user-1' }, kyc: null });
    const imagekit = { uploadFile: jest.fn().mockRejectedValue(new Error('imagekit down')) };
    const service = new SumsubService(prisma as any, imagekit as any, mailOk() as any);
    jest.spyOn(service, 'getApplicant').mockResolvedValue(fakeApplicant());
    jest.spyOn(service, 'getApplicantIdDocs').mockResolvedValue(fakeIdDocs());
    jest.spyOn(service, 'getIdDocImage').mockResolvedValue(Buffer.from('img'));

    const out = await service.processApplicantReviewed(reviewedPayload('GREEN'));

    expect(out).toBe('created_approved');
    expect(prisma.state.kyc.idImage).toBe('sumsub:appl-1');
  });

  it('listage idDocs vide (aucune image) → aucun téléchargement, référence sumsub: conservée', async () => {
    const prisma = buildFakePrisma({ user: { id: 'user-1' }, kyc: null });
    const imagekit = { uploadFile: jest.fn() };
    const service = new SumsubService(prisma as any, imagekit as any, mailOk() as any);
    jest.spyOn(service, 'getApplicant').mockResolvedValue(fakeApplicant());
    jest.spyOn(service, 'getApplicantIdDocs').mockResolvedValue([]);
    const getImg = jest.spyOn(service, 'getIdDocImage');

    const out = await service.processApplicantReviewed(reviewedPayload('GREEN'));

    expect(out).toBe('created_approved');
    expect(getImg).not.toHaveBeenCalled();
    expect(imagekit.uploadFile).not.toHaveBeenCalled();
    expect(prisma.state.kyc.idImage).toBe('sumsub:appl-1');
  });

  it('échec listage idDocs → repli sumsub:, ligne Kyc créée quand même', async () => {
    const prisma = buildFakePrisma({ user: { id: 'user-1' }, kyc: null });
    const imagekit = { uploadFile: jest.fn() };
    const service = new SumsubService(prisma as any, imagekit as any, mailOk() as any);
    jest.spyOn(service, 'getApplicant').mockResolvedValue(fakeApplicant());
    jest.spyOn(service, 'getApplicantIdDocs').mockRejectedValue(new Error('403'));
    const getImg = jest.spyOn(service, 'getIdDocImage');

    const out = await service.processApplicantReviewed(reviewedPayload('GREEN'));

    expect(out).toBe('created_approved');
    expect(getImg).not.toHaveBeenCalled();
    expect(prisma.state.kyc.idImage).toBe('sumsub:appl-1');
  });

  it('inspectionId absent du webhook → images non téléchargées, repli sumsub:', async () => {
    const prisma = buildFakePrisma({ user: { id: 'user-1' }, kyc: null });
    const imagekit = { uploadFile: jest.fn() };
    const service = new SumsubService(prisma as any, imagekit as any, mailOk() as any);
    jest.spyOn(service, 'getApplicant').mockResolvedValue(fakeApplicant());
    jest.spyOn(service, 'getApplicantIdDocs').mockResolvedValue(fakeIdDocs());
    const getImg = jest.spyOn(service, 'getIdDocImage');

    const payload = reviewedPayload('GREEN');
    delete (payload as any).inspectionId;
    const out = await service.processApplicantReviewed(payload);

    expect(out).toBe('created_approved');
    expect(getImg).not.toHaveBeenCalled();
    expect(prisma.state.kyc.idImage).toBe('sumsub:appl-1');
  });
});

describe('SumsubService — email d\'approbation (sendKycApproved)', () => {
  it('created_approved → envoie l\'email UNE fois (email + nom)', async () => {
    const prisma = buildFakePrisma({ user: { id: 'user-1', email: 'c@ex.com' }, kyc: null });
    const mail = { sendKycApproved: jest.fn().mockResolvedValue(undefined) };
    const service = new SumsubService(prisma as any, imagekitOk() as any, mail as any);
    jest.spyOn(service, 'getApplicant').mockResolvedValue(fakeApplicant());
    jest.spyOn(service, 'getApplicantIdDocs').mockResolvedValue([]);

    const out = await service.processApplicantReviewed(reviewedPayload('GREEN'));

    expect(out).toBe('created_approved');
    expect(mail.sendKycApproved).toHaveBeenCalledTimes(1);
    expect(mail.sendKycApproved).toHaveBeenCalledWith('c@ex.com', 'Jean Baptiste');
  });

  it('approved (Kyc PENDING → APPROVED) → envoie l\'email UNE fois', async () => {
    const prisma = buildFakePrisma({
      user: { id: 'user-1', email: 'c@ex.com' },
      kyc: { id: 'kyc-1', status: 'PENDING', firstName: 'Marie', lastName: 'Joseph' },
    });
    const mail = { sendKycApproved: jest.fn().mockResolvedValue(undefined) };
    const service = new SumsubService(prisma as any, imagekitOk() as any, mail as any);

    const out = await service.processApplicantReviewed(reviewedPayload('GREEN'));

    expect(out).toBe('approved');
    expect(mail.sendKycApproved).toHaveBeenCalledTimes(1);
    expect(mail.sendKycApproved).toHaveBeenCalledWith('c@ex.com', 'Marie Joseph');
  });

  it('KYC DÉJÀ APPROVED → aucun email (requirement 3)', async () => {
    const prisma = buildFakePrisma({
      user: { id: 'user-1', email: 'c@ex.com' },
      kyc: { id: 'kyc-1', status: 'APPROVED' },
    });
    const mail = { sendKycApproved: jest.fn().mockResolvedValue(undefined) };
    const service = new SumsubService(prisma as any, imagekitOk() as any, mail as any);

    const out = await service.processApplicantReviewed(reviewedPayload('GREEN'));

    expect(out).toBe('already_approved');
    expect(mail.sendKycApproved).not.toHaveBeenCalled();
  });

  it('DOUBLON (même applicantId + reviewStatus) → aucun email (requirement 2)', async () => {
    const prisma = buildFakePrisma({
      user: { id: 'user-1', email: 'c@ex.com', sumsubApplicantId: 'appl-1', sumsubReviewStatus: 'completed' },
      kyc: { id: 'kyc-1', status: 'PENDING', firstName: 'A', lastName: 'B' },
    });
    const mail = { sendKycApproved: jest.fn().mockResolvedValue(undefined) };
    const service = new SumsubService(prisma as any, imagekitOk() as any, mail as any);

    const out = await service.processApplicantReviewed(reviewedPayload('GREEN'));

    expect(out).toBe('duplicate');
    expect(mail.sendKycApproved).not.toHaveBeenCalled();
  });

  it('échec d\'envoi email → NON bloquant: KYC reste créé/approuvé, pas d\'exception (requirement 1)', async () => {
    const prisma = buildFakePrisma({ user: { id: 'user-1', email: 'c@ex.com' }, kyc: null });
    const mail = { sendKycApproved: jest.fn().mockRejectedValue(new Error('brevo down')) };
    const service = new SumsubService(prisma as any, imagekitOk() as any, mail as any);
    jest.spyOn(service, 'getApplicant').mockResolvedValue(fakeApplicant());
    jest.spyOn(service, 'getApplicantIdDocs').mockResolvedValue([]);

    const out = await service.processApplicantReviewed(reviewedPayload('GREEN'));

    expect(out).toBe('created_approved'); // résolu malgré l'échec email
    expect(prisma.state.kyc.status).toBe('APPROVED');
    expect(mail.sendKycApproved).toHaveBeenCalledTimes(1);
  });
});
