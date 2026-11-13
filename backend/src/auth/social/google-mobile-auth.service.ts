import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';

export interface GoogleMobileIdentity {
  sub: string;
  email: string;
  emailVerified: boolean;
  firstName?: string;
  lastName?: string;
}

// 13 nov 2026 — bouton Google te inèt nan app mobil la (flux backend se
// redireksyon web sèlman). Wout sa a verifye yon idToken Google mobil
// (iOS/Android/Web client — google-auth-library fè sa li menm, pa gen
// JWKS/kach manyèl pou ekri kontrèman ak Apple).
@Injectable()
export class GoogleMobileAuthService {
  private readonly logger = new Logger(GoogleMobileAuthService.name);
  private readonly client = new OAuth2Client();

  private getClientIds(): string[] {
    const raw = process.env.GOOGLE_MOBILE_CLIENT_IDS || '';
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  }

  async verifyIdToken(idToken: string): Promise<GoogleMobileIdentity> {
    const audience = this.getClientIds();
    if (!audience.length) {
      this.logger.warn('GOOGLE_MOBILE_CLIENT_IDS pa konfigire — refize tout tantativ Google mobil.');
      throw new BadRequestException('Koneksyon Google pa disponib kounye a. Tanpri eseye ankò pita.');
    }

    let ticket;
    try {
      ticket = await this.client.verifyIdToken({ idToken, audience });
    } catch (err: any) {
      throw new BadRequestException('Token Google envalid oswa ekspire.');
    }

    const payload = ticket.getPayload();
    if (!payload?.sub) {
      throw new BadRequestException('Token Google envalid.');
    }
    if (!payload.email_verified) {
      throw new BadRequestException('Email Google ou a pa verifye. Tanpri itilize yon lòt metòd koneksyon.');
    }
    if (!payload.email) {
      throw new BadRequestException('Token Google envalid.');
    }

    return {
      sub: payload.sub,
      email: payload.email.toLowerCase(),
      emailVerified: true,
      firstName: payload.given_name,
      lastName: payload.family_name,
    };
  }
}
