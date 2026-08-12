import { Injectable } from '@nestjs/common';

export interface CardOtpEntry {
  code: string;
  last4?: string;
  cardBrand?: string;
  reference?: string;
  expiresAt: number;
}

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minit — StroWallet konfime se dire OTP machann yo

// An memwa sèlman, PA BDD — swiv enstriksyon sekirite StroWallet ("pa
// estoke kòd la san rezon"). Disparèt otomatikman apre 10 min oswa nan
// pwochen restart. Yon sèl pwosesis Render (konfime), donk pa gen bezwen
// yon cache pataje ant plizyè enstans.
@Injectable()
export class CardOtpService {
  private readonly store = new Map<string, CardOtpEntry>();

  set(userId: string, entry: Omit<CardOtpEntry, 'expiresAt'>) {
    this.store.set(userId, { ...entry, expiresAt: Date.now() + OTP_TTL_MS });
  }

  get(userId: string): (Omit<CardOtpEntry, 'expiresAt'> & { expiresInSeconds: number }) | null {
    const entry = this.store.get(userId);
    if (!entry) return null;
    const expiresInSeconds = Math.round((entry.expiresAt - Date.now()) / 1000);
    if (expiresInSeconds <= 0) {
      this.store.delete(userId);
      return null;
    }
    const { expiresAt, ...rest } = entry;
    return { ...rest, expiresInSeconds };
  }
}
