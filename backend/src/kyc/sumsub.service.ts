import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ImageKitService } from '../imagekit/imagekit.service';
import { MailService } from '../mail/mail.service';

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

// ── Extraction des champs Kyc depuis un applicant Sumsub (GET …/one) ───────
// Pure, testable. Lit `info` puis `fixedInfo` en repli. Retourne null si les
// champs d'IDENTITÉ essentiels manquent (on ne crée alors aucune ligne Kyc).
// phone/adresse: repli sur '' si absents (colonnes NOT NULL). idImage/userPhoto:
// référence `sumsub:{applicantId}` (les images Sumsub ne sont pas des URLs publiques).
export function extractKycFieldsFromApplicant(
  applicant: any,
  applicantId: string,
): null | {
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  phoneNumber: string;
  idType: string;
  idNumber: string;
  idImage: string;
  userPhoto: string;
  line1: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
} {
  const info = applicant?.info || {};
  const fixed = applicant?.fixedInfo || {};
  const pick = (k: string) => info[k] ?? fixed[k] ?? null;

  const firstName = pick('firstName');
  const lastName = pick('lastName');
  const dob = pick('dob'); // "YYYY-MM-DD"
  const country = pick('country') || '';
  const phone = pick('phone') || '';

  const idDocs = (info.idDocs?.length ? info.idDocs : fixed.idDocs) || [];
  const idDoc = idDocs[0] || {};
  const idType = idDoc.idDocType || '';
  const idNumber = idDoc.number || '';

  const addresses = (info.addresses?.length ? info.addresses : fixed.addresses) || [];
  const addr = addresses[0] || {};
  const line1 = addr.street || addr.formattedAddress || '';
  const city = addr.town || '';
  const state = addr.state || '';
  const zipCode = addr.postCode || '';

  // Identité essentielle : sans ça, pas de création (évite un Kyc APPROVED vide).
  if (!firstName || !lastName || !dob || !idType || !idNumber || !country) {
    return null;
  }
  const dateOfBirth = new Date(dob);
  if (isNaN(dateOfBirth.getTime())) return null;

  return {
    firstName,
    lastName,
    dateOfBirth,
    phoneNumber: phone,
    idType,
    idNumber,
    idImage: `sumsub:${applicantId}`,
    userPhoto: `sumsub:${applicantId}`,
    line1,
    city,
    state,
    zipCode,
    country,
  };
}

// ── Références d'images à partir de la liste idDocs Sumsub ─────────────────
// Pure, testable. Prend en entrée le tableau renvoyé par getApplicantIdDocs()
// (GET /resources/applicants/{id}/info/idDocs?forApprovedImages=true). Retourne
// l'imageId du RECTO (1er doc non-SELFIE, imageIds[0]) et du selfie (doc SELFIE).
// L'inspectionId (pour le téléchargement) vient du payload webhook, pas d'ici.
export function extractImageRefs(idDocs: any[]): {
  idFrontImageId: string | null;
  selfieImageId: string | null;
} {
  const docs = Array.isArray(idDocs) ? idDocs : [];
  let idFrontImageId: string | null = null;
  let selfieImageId: string | null = null;
  for (const d of docs) {
    const ids = Array.isArray(d?.imageIds) ? d.imageIds : [];
    if (!ids.length) continue;
    if (String(d?.idDocType || '').toUpperCase() === 'SELFIE') {
      if (selfieImageId == null) selfieImageId = String(ids[0]);
    } else if (idFrontImageId == null) {
      idFrontImageId = String(ids[0]);
    }
  }
  return { idFrontImageId, selfieImageId };
}

@Injectable()
export class SumsubService {
  private readonly logger = new Logger('SumsubService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly imagekit: ImageKitService,
    private readonly mailService: MailService,
  ) {}

  // Envoie le MÊME email d'approbation que le chemin admin (sendKycApproved),
  // de façon STRICTEMENT NON BLOQUANTE : un échec d'envoi est seulement loggé,
  // il ne jette jamais → le webhook répond 200, le KYC reste APPROVED, et
  // Sumsub ne relance pas. Appelé UNIQUEMENT sur une NOUVELLE approbation
  // (KYC qui vient de passer APPROVED), jamais sur un doublon ni sur un KYC
  // déjà approuvé (voir les points d'appel).
  private async sendApprovalEmailSafe(
    email: string | null | undefined,
    firstName: string | null | undefined,
    lastName: string | null | undefined,
  ): Promise<void> {
    if (!email) return;
    try {
      const name = `${firstName ?? ''} ${lastName ?? ''}`.trim();
      await this.mailService.sendKycApproved(email, name);
    } catch (e: any) {
      this.logger.error(
        `Sumsub: échec envoi email d'approbation KYC (non bloquant) — ${e?.message ?? e}`,
      );
    }
  }

  private get baseUrl(): string {
    return process.env.SUMSUB_BASE_URL?.trim() || DEFAULT_BASE_URL;
  }

  private get levelName(): string {
    return process.env.SUMSUB_LEVEL_NAME?.trim() || DEFAULT_LEVEL_NAME;
  }

  get enabled(): boolean {
    return isSumsubEnabled();
  }

  // Lit le corps d'erreur d'une réponse Sumsub et n'en renvoie QUE des champs
  // NON sensibles pour le log : description, code, correlationId (jamais le
  // token, le secret ni la signature). JSON → champs choisis, tronqué à 500
  // caractères ; sinon → 200 premiers caractères du texte brut.
  private async safeSumsubErrorDetail(res: Response): Promise<string> {
    try {
      const text = await res.text();
      try {
        const j: any = JSON.parse(text);
        return JSON.stringify({
          description: j?.description,
          code: j?.code,
          correlationId: j?.correlationId,
        }).slice(0, 500);
      } catch {
        return text.slice(0, 200);
      }
    } catch {
      return '(corps illisible)';
    }
  }

  // POST {base}/resources/sdkIntegrations/levels/{LEVEL}/websdkLink
  //        ?ttlInSecs=1800&externalUserId={userId}&lang={lang}  corps {}
  // Retourne l'URL du Web SDK reçue. Aucune écriture en base.
  async generateWebSdkLink(userId: string, lang: string): Promise<string> {
    const appToken = process.env.SUMSUB_APP_TOKEN?.trim();
    const secret = process.env.SUMSUB_SECRET_KEY?.trim();
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
      // On logge UNIQUEMENT des champs d'erreur NON sensibles (description,
      // code, correlationId) — jamais token/secret/signature. Voir
      // safeSumsubErrorDetail().
      const detail = await this.safeSumsubErrorDetail(res);
      this.logger.error(`Sumsub websdkLink a échoué — HTTP ${res.status} — ${detail}`);
      throw new ServiceUnavailableException('Sumsub: génération du lien échouée');
    }

    const data: any = await res.json();
    if (!data?.url) {
      this.logger.error('Sumsub websdkLink: réponse sans `url`');
      throw new ServiceUnavailableException('Sumsub: réponse invalide');
    }
    await this.resetRejectedKycToPending(userId);
    return data.url as string;
  }

  // Nouvelle tentative après un refus : dès que le lien est généré, la ligne
  // Kyc REJECTED repasse PENDING, pour que l'app n'affiche plus l'ancien refus
  // (et que le client ne relance pas une vérification Sumsub facturée).
  // - Filtre status=REJECTED DANS la requête : un KYC APPROVED n'est jamais
  //   remis en attente, même en cas de course avec le webhook.
  // - updateMany ne crée aucune ligne : sans dossier Kyc, rien ne se passe.
  // - Seul `status` change : sumsubReviewRejectType / sumsubRejectLabels et
  //   reviewedAt restent en base pour l'historique.
  // - NON BLOQUANT : un échec est seulement loggé, le lien est quand même renvoyé.
  private async resetRejectedKycToPending(userId: string): Promise<void> {
    try {
      const { count } = await this.prisma.kyc.updateMany({
        where: { userId, status: 'REJECTED' },
        data: { status: 'PENDING' },
      });
      if (count > 0) {
        this.logger.log('Sumsub link: KYC REJECTED remis en PENDING (nouvelle tentative)');
      }
    } catch (e: any) {
      this.logger.error(
        `Sumsub link: échec de la remise en PENDING du KYC REJECTED — ${e?.message ?? e}`,
      );
    }
  }

  // Vérifie la signature d'un webhook entrant. true = authentique.
  verifyWebhook(rawBody: Buffer | string, digest?: string): boolean {
    const secret = process.env.SUMSUB_WEBHOOK_SECRET?.trim();
    if (!secret) {
      this.logger.error('Sumsub webhook: SUMSUB_WEBHOOK_SECRET manquant');
      return false;
    }
    return verifySumsubWebhookSignature(secret, rawBody, digest || '');
  }

  // ── GET signé {base}/resources/applicants/{applicantId}/one ────────────────
  // Récupère les données du candidat (nom, prénom, DOB, pays, document, et via
  // fixedInfo le téléphone/adresse). Jette sur config absente ou HTTP non-ok.
  async getApplicant(applicantId: string): Promise<any> {
    const appToken = process.env.SUMSUB_APP_TOKEN?.trim();
    const secret = process.env.SUMSUB_SECRET_KEY?.trim();
    if (!appToken || !secret) {
      this.logger.error('Sumsub: SUMSUB_APP_TOKEN/SUMSUB_SECRET_KEY manquant(s)');
      throw new ServiceUnavailableException('Sumsub non configuré');
    }

    const method = 'GET';
    const body = '';
    const path = `/resources/applicants/${encodeURIComponent(applicantId)}/one`;
    const ts = Math.floor(Date.now() / 1000);
    const sig = signSumsubRequest(secret, ts, method, path, body);

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        'X-App-Token': appToken,
        'X-App-Access-Ts': String(ts),
        'X-App-Access-Sig': sig,
      },
    });

    if (!res.ok) {
      const detail = await this.safeSumsubErrorDetail(res);
      this.logger.error(`Sumsub getApplicant a échoué — HTTP ${res.status} — ${detail}`);
      throw new ServiceUnavailableException('Sumsub: récupération applicant échouée');
    }
    return res.json();
  }

  // ── GET signé {base}/resources/applicants/{applicantId}/info/idDocs
  //        ?forApprovedImages=true
  // Liste les documents du candidat (chaque doc: idDocType + imageIds[]).
  // Normalise en tableau (réponse soit un tableau, soit { idDocs: [...] }).
  async getApplicantIdDocs(applicantId: string): Promise<any[]> {
    const appToken = process.env.SUMSUB_APP_TOKEN?.trim();
    const secret = process.env.SUMSUB_SECRET_KEY?.trim();
    if (!appToken || !secret) {
      this.logger.error('Sumsub: SUMSUB_APP_TOKEN/SUMSUB_SECRET_KEY manquant(s)');
      throw new ServiceUnavailableException('Sumsub non configuré');
    }

    const method = 'GET';
    const body = '';
    const path =
      `/resources/applicants/${encodeURIComponent(applicantId)}/info/idDocs` +
      `?forApprovedImages=true`;
    const ts = Math.floor(Date.now() / 1000);
    const sig = signSumsubRequest(secret, ts, method, path, body);

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        'X-App-Token': appToken,
        'X-App-Access-Ts': String(ts),
        'X-App-Access-Sig': sig,
      },
    });
    if (!res.ok) {
      const detail = await this.safeSumsubErrorDetail(res);
      this.logger.error(`Sumsub getApplicantIdDocs a échoué — HTTP ${res.status} — ${detail}`);
      throw new ServiceUnavailableException('Sumsub: listage idDocs échoué');
    }
    const data: any = await res.json();
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.idDocs)) return data.idDocs;
    return [];
  }

  // ── GET signé {base}/resources/inspections/{inspectionId}/resources/{imageId}
  // Renvoie le binaire de l'image (Buffer). Jette sur config absente / HTTP non-ok.
  async getIdDocImage(inspectionId: string, imageId: string): Promise<Buffer> {
    const appToken = process.env.SUMSUB_APP_TOKEN?.trim();
    const secret = process.env.SUMSUB_SECRET_KEY?.trim();
    if (!appToken || !secret) {
      this.logger.error('Sumsub: SUMSUB_APP_TOKEN/SUMSUB_SECRET_KEY manquant(s)');
      throw new ServiceUnavailableException('Sumsub non configuré');
    }

    const method = 'GET';
    const body = '';
    const path =
      `/resources/inspections/${encodeURIComponent(inspectionId)}` +
      `/resources/${encodeURIComponent(imageId)}`;
    const ts = Math.floor(Date.now() / 1000);
    const sig = signSumsubRequest(secret, ts, method, path, body);

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'X-App-Token': appToken,
        'X-App-Access-Ts': String(ts),
        'X-App-Access-Sig': sig,
      },
    });
    if (!res.ok) {
      const detail = await this.safeSumsubErrorDetail(res);
      this.logger.error(`Sumsub getIdDocImage a échoué — HTTP ${res.status} — ${detail}`);
      throw new ServiceUnavailableException('Sumsub: récupération image échouée');
    }
    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  }

  // Télécharge une image Sumsub et la pousse sur ImageKit (même mécanisme que
  // l'upload KYC existant). Retourne l'URL ImageKit, ou null si échec
  // (téléchargement OU upload) — jamais d'exception propagée.
  private async fetchAndStoreSumsubImage(
    inspectionId: string,
    imageId: string,
    fileName: string,
  ): Promise<string | null> {
    try {
      const buffer = await this.getIdDocImage(inspectionId, imageId);
      // ImageKitService.uploadFile lit seulement file.buffer et file.originalname.
      const url = await this.imagekit.uploadFile(
        { buffer, originalname: fileName, mimetype: 'image/jpeg' } as any,
        'kyc',
      );
      return url;
    } catch (e: any) {
      this.logger.error(
        `Sumsub: échec récupération/upload image (${fileName}) — repli référence sumsub: ${e?.message ?? e}`,
      );
      return null;
    }
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
    | 'created_approved'
    | 'sumsub_fetch_failed'
    | 'incomplete_applicant_data'
    | 'no_kyc_row'
    | 'already_approved'
    | 'noop'
  > {
    const externalUserId: string | undefined = payload?.externalUserId;
    const applicantId: string | null = payload?.applicantId ?? null;
    const levelName: string | null = payload?.levelName ?? null;
    const reviewStatus: string | null = payload?.reviewStatus ?? null;
    const inspectionId: string | null = payload?.inspectionId ?? null;
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

    const kyc = user.kyc;

    // Marqueur d'idempotence + corrélation du dossier Sumsub. Écrit SEULEMENT
    // à la fin, une fois le traitement RÉELLEMENT terminé : si on l'écrivait
    // avant un échec getApplicant, la relance Sumsub serait vue comme un
    // doublon et la ligne Kyc ne serait jamais créée.
    const persistMeta = () =>
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          sumsubApplicantId: applicantId,
          sumsubLevelName: levelName,
          sumsubReviewStatus: reviewStatus,
        },
      });

    if (reviewAnswer === 'GREEN') {
      if (kyc) {
        if (kyc.status === 'APPROVED') {
          // Déjà approuvé (ancien flux ou webhook précédent) — on ne réécrit pas.
          this.logger.log('Sumsub GREEN: KYC déjà APPROVED — non réécrit');
          await persistMeta();
          return 'already_approved';
        }
        await this.prisma.kyc.update({
          where: { id: kyc.id },
          data: { status: 'APPROVED', reviewedAt: new Date() },
        });
        this.logger.log(`Sumsub GREEN: KYC approuvé (kycId=${kyc.id})`);
        await persistMeta();
        // Nouvelle approbation (le KYC vient de passer de non-APPROVED à APPROVED).
        await this.sendApprovalEmailSafe(user.email, kyc.firstName, kyc.lastName);
        return 'approved';
      }

      // Flux Sumsub-first : aucune ligne Kyc → la créer depuis les données Sumsub.
      if (!applicantId) {
        this.logger.warn('Sumsub GREEN sans ligne Kyc ni applicantId — rien créé');
        await persistMeta();
        return 'no_kyc_row';
      }
      let applicant: any;
      try {
        applicant = await this.getApplicant(applicantId);
      } catch {
        // Échec de l'appel Sumsub → 200 sans AUCUNE écriture (pas même le
        // marqueur) pour que Sumsub réessaie le webhook.
        this.logger.error(
          'Sumsub GREEN: échec getApplicant — aucune écriture, 200 pour relance Sumsub',
        );
        return 'sumsub_fetch_failed';
      }
      const fields = extractKycFieldsFromApplicant(applicant, applicantId);
      if (!fields) {
        this.logger.warn(
          'Sumsub GREEN: données applicant incomplètes (identité/document) — aucune ligne Kyc créée',
        );
        await persistMeta();
        return 'incomplete_applicant_data';
      }

      // Images : liste via l'endpoint idDocs dédié (download via inspections).
      // On remplace la référence `sumsub:` par une vraie URL ImageKit. En cas
      // d'échec (listage/téléchargement/upload), on GARDE la référence `sumsub:`
      // et on crée quand même la ligne Kyc — jamais de blocage.
      let idDocs: any[] = [];
      try {
        idDocs = await this.getApplicantIdDocs(applicantId);
      } catch (e: any) {
        this.logger.error(`Sumsub: échec listage idDocs — repli sumsub: ${e?.message ?? e}`);
      }
      // Diagnostic PERMANENT, SANS donnée personnelle : nb de documents, leurs
      // idDocType, et le nombre d'imageIds par document.
      this.logger.log(
        `Sumsub idDocs: ${idDocs.length} document(s)` +
          (idDocs.length
            ? ' — ' +
              idDocs
                .map(
                  (d: any, i: number) =>
                    `#${i} type=${d?.idDocType ?? '?'} images=${Array.isArray(d?.imageIds) ? d.imageIds.length : 0}`,
                )
                .join(' | ')
            : ''),
      );

      const refs = extractImageRefs(idDocs);
      if (!inspectionId && (refs.idFrontImageId || refs.selfieImageId)) {
        this.logger.warn(
          'Sumsub: inspectionId absent du webhook — images non téléchargées, repli sumsub:',
        );
      }
      if (inspectionId && refs.idFrontImageId) {
        const url = await this.fetchAndStoreSumsubImage(
          inspectionId,
          refs.idFrontImageId,
          `sumsub-${applicantId}-id-front.jpg`,
        );
        if (url) fields.idImage = url;
      }
      if (inspectionId && refs.selfieImageId) {
        const url = await this.fetchAndStoreSumsubImage(
          inspectionId,
          refs.selfieImageId,
          `sumsub-${applicantId}-selfie.jpg`,
        );
        if (url) fields.userPhoto = url;
      }

      const created = await this.prisma.kyc.create({
        data: {
          userId: user.id,
          status: 'APPROVED',
          reviewedAt: new Date(),
          ...fields,
        },
      });
      this.logger.log(`Sumsub GREEN: ligne Kyc créée + APPROVED (kycId=${created.id})`);
      await persistMeta();
      // Nouvelle approbation (ligne Kyc créée directement en APPROVED).
      await this.sendApprovalEmailSafe(user.email, fields.firstName, fields.lastName);
      return 'created_approved';
    }

    if (reviewAnswer === 'RED') {
      if (!kyc) {
        // RED sans dossier : on n'invente pas de ligne Kyc, on garde la trace.
        this.logger.warn(
          'Sumsub RED: aucune ligne Kyc pour cet utilisateur — métadonnées enregistrées',
        );
        await persistMeta();
        return 'no_kyc_row';
      }
      if (kyc.status === 'APPROVED') {
        // NE JAMAIS écraser une approbation existante avec un rejet Sumsub.
        this.logger.warn('Sumsub RED: KYC déjà APPROVED — NON écrasé');
        await persistMeta();
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
      await persistMeta();
      return 'rejected';
    }

    this.logger.log(
      `Sumsub applicantReviewed: reviewAnswer inattendu=${reviewAnswer ?? '?'} — métadonnées enregistrées, statut KYC inchangé`,
    );
    await persistMeta();
    return 'noop';
  }
}
