import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

// Tracks rate limits per API Key instead of per IP, so each key gets its own
// 100/min + 1000/day budget regardless of how many keys share a network.
@Injectable()
export class ApiKeyThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return req.apiKey?.id ? `apikey_${req.apiKey.id}` : req.ip;
  }
}
