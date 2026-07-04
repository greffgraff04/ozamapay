import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

export interface MigrationStatus {
  inSync: boolean;
  totalLocalMigrations: number;
  totalApplied: number;
  latestApplied: string | null;
  latestAppliedAt: Date | null;
  pending: string[];
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private consecutiveFailures = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkHealth(): Promise<void> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      this.consecutiveFailures = 0;
    } catch (err: unknown) {
      this.consecutiveFailures++;
      this.logger.warn(
        `DB health check failed (${this.consecutiveFailures} consecutive): ${err}`,
      );
      if (this.consecutiveFailures >= 2) {
        this.consecutiveFailures = 0;
        const errorMsg = err instanceof Error ? err.message : String(err);
        await this.mailService.sendSystemAlert(errorMsg, Math.round(process.uptime()));
      }
    }
  }

  // ── Migration drift detection ──────────────────────────────────────────
  // Compares migrations present on disk (prisma/migrations) against what
  // Postgres' _prisma_migrations table records as actually finished, so we
  // can catch the exact failure mode that caused the 2026-07-04 incident:
  // `prisma migrate deploy` silently not applying a migration during the
  // Render build, leaving the app running against a stale schema.

  async getMigrationStatus(): Promise<MigrationStatus> {
    const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations');

    let localMigrations: string[] = [];
    try {
      localMigrations = fs
        .readdirSync(migrationsDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort();
    } catch (err) {
      this.logger.error(`Pa ka li dosye prisma/migrations: ${err}`);
      // If we can't even read the migrations folder, we can't prove we're
      // in sync — fail closed rather than silently reporting "ok".
      return {
        inSync: false,
        totalLocalMigrations: 0,
        totalApplied: 0,
        latestApplied: null,
        latestAppliedAt: null,
        pending: ['<pa ka li dosye migrasyon yo>'],
      };
    }

    let applied: { migration_name: string; finished_at: Date | null }[] = [];
    try {
      applied = await this.prisma.$queryRaw<
        { migration_name: string; finished_at: Date | null }[]
      >`SELECT migration_name, finished_at FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
    } catch (err) {
      this.logger.error(`Pa ka li tab _prisma_migrations: ${err}`);
      return {
        inSync: false,
        totalLocalMigrations: localMigrations.length,
        totalApplied: 0,
        latestApplied: null,
        latestAppliedAt: null,
        pending: localMigrations,
      };
    }

    const appliedNames = new Set(applied.map((a) => a.migration_name));
    const pending = localMigrations.filter((m) => !appliedNames.has(m));

    const latest = [...applied].sort((a, b) => {
      const at = a.finished_at ? a.finished_at.getTime() : 0;
      const bt = b.finished_at ? b.finished_at.getTime() : 0;
      return bt - at;
    })[0];

    return {
      inSync: pending.length === 0,
      totalLocalMigrations: localMigrations.length,
      totalApplied: applied.length,
      latestApplied: latest?.migration_name ?? null,
      latestAppliedAt: latest?.finished_at ?? null,
      pending,
    };
  }

  // Called once at startup, before the server starts accepting traffic.
  // Throws if the schema is out of sync — the process must not come up
  // silently serving requests against a database it doesn't match.
  async assertMigrationsInSync(): Promise<void> {
    const status = await this.getMigrationStatus();

    if (!status.inSync) {
      const msg =
        `Schema DB pa senkronize ak Prisma — ${status.pending.length} migrasyon an atant: ` +
        `${status.pending.join(', ')} (dènye migrasyon aplike: ${status.latestApplied ?? 'okenn'})`;
      this.logger.error(`❌ SCHEMA DRIFT DETECTED AU DEMARAJ — ${msg}`);

      try {
        await this.mailService.sendSystemAlert(msg, Math.round(process.uptime()));
      } catch (alertErr) {
        this.logger.error(`Echwe voye alèt SCHEMA DRIFT: ${alertErr}`);
      }

      throw new Error(`Migrasyon DB pa aplike — sèvè a p ap demare: ${msg}`);
    }

    this.logger.log(
      `✅ Schema DB senkronize (${status.totalApplied} migrasyon aplike, dènye: ${status.latestApplied})`,
    );
  }
}
