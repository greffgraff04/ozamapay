import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

// ── Sumsub integration — ENTIÈREMENT derrière SUMSUB_ENABLED ───────────────
// Rien ici ne touche au flux KYC maison existant (/kyc/submit, /kyc/status).
// Tant que SUMSUB_ENABLED !== 'true', generateWebSdkLink n'est jamais appelé
// (les endpoints renvoient 404) et aucune écriture en base n'est faite.

const DEFAULT_BASE_URL = 'https://api.sumsub.com';
const DEFAULT_LEVEL_NAME = 'id-and-liveness';

// Le flag est lu à chaque appel (pas de const au moment de l'import) pour que
// les tests et un éventuel changement d'env à chaud soient pris en compte.
export function isSumsubEnabled(): boolean {
  return process.env.SUMSUB_ENABLED === 'true';
}

// ── Signature des requêtes SORTANTES vers Sumsub ───────────────────────────
// X-App-Access-Sig = HMAC-SHA256(secret, ts + method + path + body)
// `path` inclut la query string, exactement comme envoyé dans la requête.
// Fonction pure, testable sans la couche HTTP.
export function signSumsubRequest(
  secret: string,
  ts: number,
  method: string,
  path: string,
  body: string,
): string {
  return crypto
    .createHmac('sha256', secret)
    .update(`${ts}${method}${path}${body}`)
    .digest('hex');
}

// ── Vérification des webhooks ENTRANTS de Sumsub ───────────────────────────
// En-tête x-payload-digest = HMAC-SHA256(SUMSUB_WEBHOOK_SECRET, corps brut).
// Comparaison en temps constant. Fonction pure, testable sans la couche HTTP.
export function verifySumsubWebhookSignature(
  secret: string,
  rawBody: Buffer | string,
  digest: string,
): boolean {
  if (!secret || !digest) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(digest, 'hex');
  // Longueurs différentes → timingSafeEqual jette ; on court-circuite.
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

@Injectable()
export class SumsubService {
  private readonly logger = new Logger('SumsubService');

  constructor(private readonly prisma: PrismaService) {}

  private get baseUrl(): string {
    return process.env.SUMSUB_BASE_URL || DEFAULT_BASE_URL;
  }

  private get levelName(): string {
    return process.env.SUMSUB_LEVEL_NAME || DEFAULT_LEVEL_NAME;
  }

  get enabled(): boolean {
    return isSumsubEnabled();
  }

  // POST {base}/resources/sdkIntegrations/levels/{LEVEL}/websdkLink
  //        ?ttlInSecs=1800&externalUserId={userId}&lang={lang}  corps {}
  // Retourne l'URL du Web SDK reçue. Aucune écriture en base.
  async generateWebSdkLink(userId: string, lang: string): Promise<string> {
    const appToken = process.env.SUMSUB_APP_TOKEN;
    const secret = process.env.SUMSUB_SECRET_KEY;
    if (!appToken || !secret) {
      // Ne jamais logguer les valeurs — juste signaler l'absence de config.
      this.logger.error('Sumsub: SUMSUB_APP_TOKEN/SUMSUB_SECRET_KEY manquant(s)');
      throw new ServiceUnavailableException('Sumsub non configuré');
    }

    const method = 'POST';
    const body = '{}';
    const query =
      `?ttlInSecs=1800` +
      `&externalUserId=${encodeURIComponent(userId)}` +
      `&lang=${encodeURIComponent(lang)}`;
    // Le path signé doit être IDENTIQUE à celui réellement requêté.
    const path =
      `/resources/sdkIntegrations/levels/${encodeURIComponent(this.levelName)}` +
      `/websdkLink${query}`;
    const ts = Math.floor(Date.now() / 1000);
    const sig = signSumsubRequest(secret, ts, method, path, body);

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-App-Token': appToken,
        'X-App-Access-Ts': String(ts),
        'X-App-Access-Sig': sig,
      },
      body,
    });

    if (!res.ok) {
      // Ne pas logguer le corps complet (peut contenir des détails sensibles).
      this.logger.error(`Sumsub websdkLink a échoué — HTTP ${res.status}`);
      throw new ServiceUnavailableException('Sumsub: génération du lien échouée');
    }

    const data: any = await res.json();
    if (!data?.url) {
      this.logger.error('Sumsub websdkLink: réponse sans `url`');
      throw new ServiceUnavailableException('Sumsub: réponse invalide');
    }
    return data.url as string;
  }

  // Vérifie la signature d'un webhook entrant. true = authentique.
  verifyWebhook(rawBody: Buffer | string, digest?: string): boolean {
    const secret = process.env.SUMSUB_WEBHOOK_SECRET;
    if (!secret) {
      this.logger.error('Sumsub webhook: SUMSUB_WEBHOOK_SECRET manquant');
      return false;
    }
    return verifySumsubWebhookSignature(secret, rawBody, digest || '');
  }

  // ── Traitement d'un webhook Sumsub `applicantReviewed` ─────────────────────
  // Idempotent, ne jette pas sur les cas normaux (user introuvable / doublon /
  // déjà approuvé). N'ÉCRASE JAMAIS un KYC déjà APPROVED (ancien flux inclus).
  // Utilise EXACTEMENT les mêmes champs que l'approbation existante
  // (Kyc.status + Kyc.reviewedAt) — pas de débit de frais, pas de commission.
  async processApplicantReviewed(payload: any): Promise<
    | 'user_not_found'
    | 'duplicate'
    | 'approved'
    | 'rejected'
    | 'no_kyc_row'
    | 'already_approved'
    | 'noop'
  > {
    const externalUserId: string | undefined = payload?.externalUserId;
    const applicantId: string | null = payload?.applicantId ?? null;
    const levelName: string | null = payload?.levelName ?? null;
    const reviewStatus: string | null = payload?.reviewStatus ?? null;
    const reviewAnswer: string | undefined = payload?.reviewResult?.reviewAnswer;
    const rejectType: string | null = payload?.reviewResult?.reviewRejectType ?? null;
    const rejectLabels: string[] = Array.isArray(payload?.reviewResult?.rejectLabels)
      ? payload.reviewResult.rejectLabels
      : [];

    if (!externalUserId) {
      this.logger.warn('Sumsub webhook: externalUserId absent — ignoré');
      return 'user_not_found';
    }

    const user = await this.prisma.user.findUnique({
      where: { id: externalUserId },
      include: { kyc: true },
    });
    if (!user) {
      this.logger.warn(
        `Sumsub webhook: externalUserId introuvable (applicantId=${applicantId}) — ignoré, aucune écriture`,
      );
      return 'user_not_found';
    }

    // Idempotence : même applicantId + reviewStatus déjà traité → on ne réécrit pas.
    if (
      applicantId &&
      user.sumsubApplicantId === applicantId &&
      user.sumsubReviewStatus === reviewStatus
    ) {
      this.logger.log(
        `Sumsub webhook: doublon (applicantId/reviewStatus déjà traité) — ignoré`,
      );
      return 'duplicate';
    }

    // Corrélation du dossier Sumsub sur l'utilisateur (toujours, même si pas de Kyc).
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        sumsubApplicantId: applicantId,
        sumsubLevelName: levelName,
        sumsubReviewStatus: reviewStatus,
      },
    });

    const kyc = user.kyc;

    if (reviewAnswer === 'GREEN') {
      if (!kyc) {
        this.logger.warn(
          'Sumsub GREEN: aucune ligne Kyc pour cet utilisateur — métadonnées enregistrées, statut non modifié',
        );
        return 'no_kyc_row';
      }
      if (kyc.status === 'APPROVED') {
        // Déjà approuvé (par l'ancien flux ou un webhook précédent) — on ne réécrit pas.
        this.logger.log('Sumsub GREEN: KYC déjà APPROVED — non réécrit');
        return 'already_approved';
      }
      await this.prisma.kyc.update({
        where: { id: kyc.id },
        data: { status: 'APPROVED', reviewedAt: new Date() },
      });
      this.logger.log(`Sumsub GREEN: KYC approuvé (kycId=${kyc.id})`);
      return 'approved';
    }

    if (reviewAnswer === 'RED') {
      if (!kyc) {
        this.logger.warn(
          'Sumsub RED: aucune ligne Kyc pour cet utilisateur — métadonnées enregistrées',
        );
        return 'no_kyc_row';
      }
      if (kyc.status === 'APPROVED') {
        // NE JAMAIS écraser une approbation existante avec un rejet Sumsub.
        this.logger.warn('Sumsub RED: KYC déjà APPROVED — NON écrasé');
        return 'already_approved';
      }
      await this.prisma.kyc.update({
        where: { id: kyc.id },
        data: {
          status: 'REJECTED',
          reviewedAt: new Date(),
          sumsubReviewRejectType: rejectType,
          sumsubRejectLabels: rejectLabels,
        },
      });
      this.logger.log(
        `Sumsub RED: KYC rejeté (kycId=${kyc.id}) rejectType=${rejectType ?? '?'} labels=[${rejectLabels.join(',')}]`,
      );
      return 'rejected';
    }

    this.logger.log(
      `Sumsub applicantReviewed: reviewAnswer inattendu=${reviewAnswer ?? '?'} — métadonnées enregistrées, statut KYC inchangé`,
    );
    return 'noop';
  }
}
