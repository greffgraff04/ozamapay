import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

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
}
