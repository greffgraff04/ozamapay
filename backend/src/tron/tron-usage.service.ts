import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// DB-backed (not in-memory) specifically because an in-memory counter loses
// accuracy on every redeploy — exactly what left us blind to how close we
// were to TronGrid's 100,000/day quota during the 2026-08-01 incident,
// where several redeploys happened the same day the quota got exhausted.
function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // "2026-08-01" (UTC)
}

@Injectable()
export class TronUsageService {
  private readonly logger = new Logger(TronUsageService.name);

  constructor(private readonly prisma: PrismaService) {}

  async recordCall(count = 1): Promise<void> {
    try {
      const date = todayKey();
      await this.prisma.tronGridUsage.upsert({
        where: { date },
        update: { count: { increment: count } },
        create: { date, count },
      });
    } catch (err: any) {
      // Never let usage tracking itself break a real TronGrid call's caller.
      this.logger.error(`recordCall echwe: ${err.message}`);
    }
  }

  async getTodayUsage(): Promise<{ date: string; count: number; quotaAlertSentAt: Date | null }> {
    const date = todayKey();
    const row = await this.prisma.tronGridUsage.findUnique({ where: { date } });
    return row ?? { date, count: 0, quotaAlertSentAt: null };
  }

  async markQuotaAlertSent(): Promise<void> {
    const date = todayKey();
    await this.prisma.tronGridUsage.upsert({
      where: { date },
      update: { quotaAlertSentAt: new Date() },
      create: { date, count: 0, quotaAlertSentAt: new Date() },
    });
  }
}
