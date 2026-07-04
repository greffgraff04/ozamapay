import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';
import { HealthService } from './health.service';

@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly healthService: HealthService,
  ) {}

  @Get('detailed')
  async getDetailed() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        db: true,
        uptime: process.uptime(),
        timestamp: new Date(),
      };
    } catch {
      return {
        status: 'down',
        db: false,
        uptime: process.uptime(),
        timestamp: new Date(),
      };
    }
  }

  // GET /health/migrations — lets admin check migration sync status without
  // needing direct DB/psql access (the exact gap that delayed catching the
  // 2026-07-04 schema-drift incident).
  @Get('migrations')
  async getMigrations() {
    const status = await this.healthService.getMigrationStatus();
    return {
      status: status.inSync ? 'ok' : 'drift',
      ...status,
    };
  }
}
