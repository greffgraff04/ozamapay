import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as crypto from 'crypto';

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
}
