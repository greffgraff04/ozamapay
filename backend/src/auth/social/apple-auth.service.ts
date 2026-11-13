import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as jwt from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';
import { decryptAppleRefreshToken, encryptAppleRefreshToken } from './apple-token.util';

const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';
const APPLE_TOKEN_URL = 'https://appleid.apple.com/auth/token';
const APPLE_REVOKE_URL = 'https://appleid.apple.com/auth/revoke';

export interface AppleIdentity {
  sub: string;
  email?: string;
  emailVerified: boolean;
  isPrivateEmail: boolean;
}

// 13 nov 2026 — Sign in with Apple (guideline 4.8). Verifikasyon
// identityToken (JWKS, mis an kach pa jwks-rsa) obligatwa; echanj
// authorizationCode + revokasyon (pou sipresyon kont) OPSYONÈL — si
// APPLE_TEAM_ID/KEY_ID/PRIVATE_KEY pa konfigire, konekte a mache toujou,
// jis pa gen refresh token Apple ki sove/revoke (log warning, pa erè).
@Injectable()
export class AppleAuthService {
  private readonly logger = new Logger(AppleAuthService.name);

  // jwks-rsa gen pwòp kach entegre (defo 10min) — yon sèl kliyan pou tout
  // apèl, pa yon nouvo fetch chak login.
  private readonly jwksClient = new JwksClient({
    jwksUri: APPLE_JWKS_URL,
    cache: true,
    cacheMaxAge: 10 * 60 * 1000,
    rateLimit: true,
  });

  private getClientIds(): string[] {
    const raw = process.env.APPLE_CLIENT_IDS || '';
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  }

  hasRevocationCredentials(): boolean {
    return !!(process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY);
  }

  // Verifye siyati RS256 ak kle piblik JWKS Apple a (jwks-rsa rezoud `kid`
  // la), epi iss/aud/exp. Jete BadRequestException (mesaj kreyòl) si
  // nenpòt verifikasyon echwe — jamè detay teknik founisè a bay kliyan an.
  async verifyIdentityToken(identityToken: string): Promise<AppleIdentity> {
    const clientIds = this.getClientIds();
    if (!clientIds.length) {
      this.logger.warn('APPLE_CLIENT_IDS pa konfigire — refize tout tantativ Sign in with Apple.');
      throw new BadRequestException('Koneksyon Apple pa disponib kounye a. Tanpri eseye ankò pita.');
    }

    const decodedHeader = jwt.decode(identityToken, { complete: true });
    const kid = decodedHeader && typeof decodedHeader !== 'string' ? decodedHeader.header.kid : undefined;
    if (!kid) {
      throw new BadRequestException('Token Apple envalid.');
    }

    let signingKey: string;
    try {
      const key = await this.jwksClient.getSigningKey(kid);
      signingKey = key.getPublicKey();
    } catch (err: any) {
      this.logger.warn(`Pa ka jwenn kle piblik Apple (kid=${kid}): ${err?.message}`);
      throw new BadRequestException('Token Apple envalid.');
    }

    let payload: jwt.JwtPayload;
    try {
      payload = jwt.verify(identityToken, signingKey, {
        algorithms: ['RS256'],
        issuer: APPLE_ISSUER,
        audience: clientIds as [string, ...string[]],
      }) as jwt.JwtPayload;
    } catch (err: any) {
      throw new BadRequestException('Token Apple envalid oswa ekspire.');
    }

    if (!payload.sub) {
      throw new BadRequestException('Token Apple envalid.');
    }

    const emailVerifiedRaw = (payload as any).email_verified;
    const emailVerified = emailVerifiedRaw === true || emailVerifiedRaw === 'true';
    const isPrivateEmailRaw = (payload as any).is_private_email;

    return {
      sub: payload.sub,
      email: typeof (payload as any).email === 'string' ? (payload as any).email.toLowerCase() : undefined,
      emailVerified,
      isPrivateEmail: isPrivateEmailRaw === true || isPrivateEmailRaw === 'true',
    };
  }

  // JWT client_secret siyen ES256 ak APPLE_PRIVATE_KEY (Apple egzije sa pou
  // chak apèl /auth/token ak /auth/revoke — pa yon secret estatik).
  private buildClientSecret(): string | null {
    const teamId = process.env.APPLE_TEAM_ID;
    const keyId = process.env.APPLE_KEY_ID;
    const privateKeyRaw = process.env.APPLE_PRIVATE_KEY;
    const clientId = this.getClientIds()[0];
    if (!teamId || !keyId || !privateKeyRaw || !clientId) return null;

    // Valè PEM nan yon env var souvan gen "\n" literal olye yon vrè salt
    // liy — konvèti si sa nesesè, san danje si valè a deja gen vrè salt
    // liy.
    const privateKey = privateKeyRaw.includes('\\n') ? privateKeyRaw.replace(/\\n/g, '\n') : privateKeyRaw;

    const now = Math.floor(Date.now() / 1000);
    return jwt.sign(
      { iss: teamId, iat: now, exp: now + 300, aud: APPLE_ISSUER, sub: clientId },
      privateKey,
      { algorithm: 'ES256', keyid: keyId },
    );
  }

  // Echanj authorizationCode → refresh token Apple, chifre pou estokaj.
  // Retounen null (pa jete) si kredansyal yo manke oswa apèl la echwe —
  // konekte a dwe kontinye mache menm si sa a pa mache (wè AuthService).
  async exchangeAuthorizationCodeAndEncrypt(authorizationCode: string): Promise<string | null> {
    if (!this.hasRevocationCredentials()) {
      this.logger.warn('APPLE_TEAM_ID/KEY_ID/PRIVATE_KEY pa konfigire — pa echanj authorizationCode, pa gen revokasyon posib pita.');
      return null;
    }
    const clientSecret = this.buildClientSecret();
    const clientId = this.getClientIds()[0];
    if (!clientSecret || !clientId) return null;

    try {
      const { data } = await axios.post(
        APPLE_TOKEN_URL,
        new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code: authorizationCode,
          grant_type: 'authorization_code',
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );
      if (!data?.refresh_token) return null;
      return encryptAppleRefreshToken(data.refresh_token);
    } catch (err: any) {
      // Jamè detay (ka gen fragman sekrè nan repons erè Apple) nan log —
      // sèlman fèt ke echanj la echwe.
      this.logger.warn(`Echanj authorizationCode Apple echwe (status=${err?.response?.status ?? 'N/A'}).`);
      return null;
    }
  }

  // Apèl pandan egzekisyon sipresyon kont (AccountDeletionService). Jamè
  // jete — yon echèk revokasyon pa dwe bloke sipresyon an.
  async revokeRefreshToken(encryptedRefreshToken: string): Promise<void> {
    if (!this.hasRevocationCredentials()) {
      this.logger.warn('APPLE_TEAM_ID/KEY_ID/PRIVATE_KEY pa konfigire — pa ka revoke refresh token Apple.');
      return;
    }
    const clientSecret = this.buildClientSecret();
    const clientId = this.getClientIds()[0];
    if (!clientSecret || !clientId) return;

    let rawRefreshToken: string;
    try {
      rawRefreshToken = decryptAppleRefreshToken(encryptedRefreshToken);
    } catch (err: any) {
      this.logger.warn(`Pa ka dechifre refresh token Apple pou revokasyon: ${err?.message}`);
      return;
    }

    try {
      await axios.post(
        APPLE_REVOKE_URL,
        new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          token: rawRefreshToken,
          token_type_hint: 'refresh_token',
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );
    } catch (err: any) {
      this.logger.warn(`Revokasyon refresh token Apple echwe (status=${err?.response?.status ?? 'N/A'}).`);
    }
  }
}
