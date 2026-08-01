import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { TronUsageService } from './tron-usage.service';

// Alert only, never mutates anything — a lightweight "is the crypto
// pipeline actually alive" check on top of HealthService (which only
// verifies DB connectivity, nothing Tron-specific). Every threshold below
// is watching an OUTCOME (a deposit not yet credited, a credited deposit
// not yet swept, an address nobody has checked recently), not "did a
// function get called" — an idle period with nothing to sweep must never
// look like a failure.
const MONITOR_STALE_MINUTES = Number(process.env.TRON_HEALTH_MONITOR_STALE_MINUTES || 20);
const DEPOSIT_STUCK_HOURS = Number(process.env.TRON_HEALTH_DEPOSIT_STUCK_HOURS || 2);
const SWEEP_STUCK_HOURS = Number(process.env.TRON_HEALTH_SWEEP_STUCK_HOURS || 4);
const TRONGRID_DAILY_QUOTA = Number(process.env.TRONGRID_DAILY_QUOTA || 100_000);
const QUOTA_ALERT_THRESHOLD_PCT = Number(process.env.TRONGRID_QUOTA_ALERT_THRESHOLD_PCT || 80);

@Injectable()
export class TronHealthService {
  private readonly logger = new Logger(TronHealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly tronUsageService: TronUsageService,
  ) {}

  @Cron('*/15 * * * *')
  private async scheduledHealthCheck(): Promise<void> {
    try {
      await this.runHealthCheck();
    } catch (err: any) {
      this.logger.error(`scheduledHealthCheck echwe: ${err.message}`);
    }
  }

  async runHealthCheck(): Promise<string[]> {
    const problems: string[] = [];

    const monitorProblem = await this.checkMonitorStale();
    if (monitorProblem) problems.push(monitorProblem);

    const depositProblem = await this.checkDepositsStuck();
    if (depositProblem) problems.push(depositProblem);

    const sweepProblem = await this.checkSweepStuck();
    if (sweepProblem) problems.push(sweepProblem);

    const quotaProblem = await this.checkQuotaApproaching();
    if (quotaProblem) problems.push(quotaProblem);

    if (problems.length > 0) {
      this.logger.warn(`TronHealthService: ${problems.length} pwoblèm jwenn — voye alèt.`);
      try {
        await this.mailService.sendSystemAlert(
          `Verifikasyon sante Tron/USDT jwenn ${problems.length} pwoblèm:\n\n${problems.join('\n\n')}`,
          Math.round(process.uptime()),
        );
      } catch {}
    }

    return problems;
  }

  private async checkMonitorStale(): Promise<string | null> {
    const total = await this.prisma.depositAddress.count();
    if (total === 0) return null; // nothing to poll — not a failure

    const agg = await this.prisma.depositAddress.aggregate({ _max: { lastPolledAt: true } });
    const lastPolledAt = agg._max.lastPolledAt;
    const cutoff = new Date(Date.now() - MONITOR_STALE_MINUTES * 60_000);

    if (!lastPolledAt || lastPolledAt < cutoff) {
      const ageMsg = lastPolledAt
        ? `dènye adrès tcheke a ${Math.round((Date.now() - lastPolledAt.getTime()) / 60_000)} min pase`
        : 'okenn adrès pa janm tcheke';
      return (
        `MONITOR BLOKE: TronMonitorService pa sanble ap avanse (${ageMsg}, ` +
        `sib: <${MONITOR_STALE_MINUTES} min). Verifye si pwosesis la vivan, si boukle a kraze.`
      );
    }
    return null;
  }

  private async checkDepositsStuck(): Promise<string | null> {
    const cutoff = new Date(Date.now() - DEPOSIT_STUCK_HOURS * 60 * 60_000);
    const count = await this.prisma.cryptoDeposit.count({
      where: { status: { in: ['PENDING', 'CONFIRMED'] }, detectedAt: { lt: cutoff } },
    });
    if (count === 0) return null;

    const sample = await this.prisma.cryptoDeposit.findMany({
      where: { status: { in: ['PENDING', 'CONFIRMED'] }, detectedAt: { lt: cutoff } },
      select: { txHash: true, status: true, detectedAt: true },
      orderBy: { detectedAt: 'asc' },
      take: 5,
    });

    return (
      `DEPO KWENSE: ${count} depo rete nan PENDING/CONFIRMED depi plis pase ${DEPOSIT_STUCK_HOURS}h ` +
      `san rive CREDITED. Echantiyon: ${sample.map((d) => `${d.txHash} (${d.status})`).join(', ')}`
    );
  }

  private async checkSweepStuck(): Promise<string | null> {
    const cutoff = new Date(Date.now() - SWEEP_STUCK_HOURS * 60 * 60_000);
    const where = {
      deposits: { some: { status: 'CREDITED' as const, creditedAt: { lt: cutoff } } },
      sweeps: { none: { status: 'COMPLETED' as const } },
    };
    const count = await this.prisma.depositAddress.count({ where });
    if (count === 0) return null;

    const sample = await this.prisma.depositAddress.findMany({
      where,
      select: { address: true },
      take: 5,
    });

    return (
      `SWEEP KWENSE: ${count} adrès gen yon depo CREDITED depi plis pase ${SWEEP_STUCK_HOURS}h ` +
      `ki poko sweep. Echantiyon: ${sample.map((a) => a.address).join(', ')}. ` +
      `Verifye plafon otomatik yo (SWEEP_AUTO_MAX_*) — ka bezwen deklanchman manyèl (POST /admin/sweep/run).`
    );
  }

  private async checkQuotaApproaching(): Promise<string | null> {
    const usage = await this.tronUsageService.getTodayUsage();
    const pct = (usage.count / TRONGRID_DAILY_QUOTA) * 100;

    if (pct < QUOTA_ALERT_THRESHOLD_PCT || usage.quotaAlertSentAt) return null;

    await this.tronUsageService.markQuotaAlertSent();
    return (
      `KOTA TRONGRID PRÈSKE FIN: ${usage.count}/${TRONGRID_DAILY_QUOTA} apèl jodi a (${pct.toFixed(1)}%). ` +
      `Redwi trafik oswa kontakte sipò TronGrid anvan n frape mi a.`
    );
  }
}
