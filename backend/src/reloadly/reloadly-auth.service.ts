import { Injectable, Logger } from '@nestjs/common';
import { isStaging } from '../config/app-env';

@Injectable()
export class ReloadlyAuthService {
  private readonly logger = new Logger(ReloadlyAuthService.name);
  private readonly tokens = new Map<string, { token: string; expiresAt: number }>();

  async getToken(audience: string): Promise<string> {
    const cached = this.tokens.get(audience);
    if (cached && Date.now() < cached.expiresAt) return cached.token;

    // No module-level check at boot (credentials are only read here, lazily,
    // on first real call) — but in staging, without sandbox credentials,
    // fail locally instead of making a pointless (and possibly prod-domain)
    // real HTTP call that's guaranteed to fail auth anyway.
    if (isStaging() && (!process.env.RELOADLY_CLIENT_ID || !process.env.RELOADLY_CLIENT_SECRET)) {
      throw new Error(
        'Reloadly pa konfigire an staging (RELOADLY_CLIENT_ID/RELOADLY_CLIENT_SECRET manke) — ' +
        'aksyon gift card pa disponib.',
      );
    }

    const res = await fetch('https://auth.reloadly.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.RELOADLY_CLIENT_ID,
        client_secret: process.env.RELOADLY_CLIENT_SECRET,
        grant_type: 'client_credentials',
        audience,
      }),
    });
    if (!res.ok) throw new Error(`Reloadly auth failed (${audience}): ${await res.text()}`);

    const data = await res.json();
    this.tokens.set(audience, {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    });
    this.logger.log(`Token refreshed for ${audience}`);
    return data.access_token;
  }
}
