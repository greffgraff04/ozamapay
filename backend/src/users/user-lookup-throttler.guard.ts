import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

// Menm patwon ak ApiKeyThrottlerGuard (src/api) — trase limit la pa itilizatè
// (req.user.id, ranpli pa JwtAuthGuard ki egzekite anvan li) olye pa IP, pou
// anpeche yon moun "deviner" imel kliyan an mas atravè /users/lookup, menm
// si plizyè itilizatè pataje menm IP (menm rezo wifi, pa egzanp).
@Injectable()
export class UserLookupThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return req.user?.id ? `userlookup_${req.user.id}` : req.ip;
  }
}
