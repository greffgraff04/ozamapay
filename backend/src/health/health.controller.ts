import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

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
}
