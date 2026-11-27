import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { SumsubController } from './sumsub.controller';
import { SumsubService } from './sumsub.service';

// On construit le controller avec un SumsubService factice pour isoler la
// logique du controller (flag, signature, pas d'écriture base).
function build(overrides: Partial<SumsubService> = {}) {
  const service = {
    enabled: true,
    generateWebSdkLink: jest.fn().mockResolvedValue('https://in.sumsub.com/websdk/x'),
    verifyWebhook: jest.fn().mockReturnValue(true),
    processApplicantReviewed: jest.fn().mockResolvedValue('approved'),
    ...overrides,
  } as unknown as SumsubService;
  return { controller: new SumsubController(service), service };
}

describe('SumsubController — flag SUMSUB_ENABLED=false', () => {
  it('POST /kyc/sumsub/link → 404 et ne génère aucun lien', async () => {
    const { controller, service } = build({ enabled: false });
    await expect(controller.createLink({ user: { id: 'u1' } })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(service.generateWebSdkLink).not.toHaveBeenCalled();
  });

  it('POST /kyc/sumsub/webhook → 404 et ne vérifie rien', async () => {
    const { controller, service } = build({ enabled: false });
    await expect(
      controller.webhook(Buffer.from('{}'), 'anything'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(service.verifyWebhook).not.toHaveBeenCalled();
  });
});

describe('SumsubController — flag activé', () => {
  it('link: délègue avec l’id utilisateur connecté et lang=fr', async () => {
    const { controller, service } = build();
    const res = await controller.createLink({ user: { id: 'u-42' } });
    expect(res).toEqual({ url: 'https://in.sumsub.com/websdk/x' });
    expect(service.generateWebSdkLink).toHaveBeenCalledWith('u-42', 'fr');
  });

  it('webhook: applicantReviewed + bonne signature → 200 et délègue au traitement', async () => {
    const { controller, service } = build({ verifyWebhook: jest.fn().mockReturnValue(true) });
    const payload = { type: 'applicantReviewed', externalUserId: 'u1', reviewResult: { reviewAnswer: 'GREEN' } };
    const raw = Buffer.from(JSON.stringify(payload));
    const res = await controller.webhook(raw, 'good-digest');
    expect(res).toEqual({ ok: true });
    expect(service.verifyWebhook).toHaveBeenCalledWith(raw, 'good-digest');
    expect(service.processApplicantReviewed).toHaveBeenCalledTimes(1);
    expect((service.processApplicantReviewed as jest.Mock).mock.calls[0][0]).toMatchObject(payload);
  });

  it('webhook: type ≠ applicantReviewed → 200 sans traitement', async () => {
    const { controller, service } = build();
    const raw = Buffer.from('{"type":"applicantPending"}');
    const res = await controller.webhook(raw, 'good-digest');
    expect(res).toEqual({ ok: true });
    expect(service.processApplicantReviewed).not.toHaveBeenCalled();
  });

  it('webhook: mauvaise signature → 401', async () => {
    const { controller } = build({ verifyWebhook: jest.fn().mockReturnValue(false) });
    await expect(
      controller.webhook(Buffer.from('{}'), 'bad'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('webhook: corps brut absent → 401', async () => {
    const { controller } = build();
    await expect(
      controller.webhook(undefined as any, 'digest'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
