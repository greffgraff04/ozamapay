import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class TokenBlacklistService {
  // jti → exp (unix timestamp) — retire otomatikman apre ekspire
  private readonly store = new Map<string, number>();

  add(jti: string, exp: number): void {
    this.store.set(jti, exp);
  }

  has(jti: string): boolean {
    return this.store.has(jti);
  }

  // Chak 24h — netwaye tokens ki deja ekspire yo pou evite fuit memwa
  @Cron('0 0 * * *')
  cleanup(): void {
    const now = Math.floor(Date.now() / 1000);
    for (const [jti, exp] of this.store.entries()) {
      if (exp < now) this.store.delete(jti);
    }
  }
}
