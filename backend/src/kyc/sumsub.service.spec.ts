import {
  SumsubService,
  signSumsubRequest,
  verifySumsubWebhookSignature,
  isSumsubEnabled,
} from './sumsub.service';
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

    const service = new SumsubService({} as any);
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

    const service = new SumsubService({} as any);
    await expect(service.generateWebSdkLink('user-123', 'fr')).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('jette si Sumsub répond non-ok', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'unauthorized',
    }) as any;

    const service = new SumsubService({} as any);
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
    },
  };
}

function reviewedPayload(answer: string, extra: any = {}) {
  return {
    type: 'applicantReviewed',
    applicantId: 'appl-1',
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
    const service = new SumsubService(prisma as any);
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
    const service = new SumsubService(prisma as any);
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
    const service = new SumsubService(prisma as any);
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
    const service = new SumsubService(prisma as any);
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
    const service = new SumsubService(prisma as any);
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
    const service = new SumsubService(prisma as any);
    const out = await service.processApplicantReviewed(reviewedPayload('RED', { reviewRejectType: 'FINAL' }));

    expect(out).toBe('already_approved');
    expect(prisma.kyc.update).not.toHaveBeenCalled();
    expect(prisma.state.kyc.status).toBe('APPROVED');
  });

  it('GREEN sans ligne Kyc → métadonnées enregistrées, statut non modifié', async () => {
    const prisma = buildFakePrisma({ user: { id: 'user-1' }, kyc: null });
    const service = new SumsubService(prisma as any);
    const out = await service.processApplicantReviewed(reviewedPayload('GREEN'));

    expect(out).toBe('no_kyc_row');
    expect(prisma.kyc.update).not.toHaveBeenCalled();
    expect(prisma.state.user.sumsubApplicantId).toBe('appl-1');
  });
});
