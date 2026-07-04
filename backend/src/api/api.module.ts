import { Module } from '@nestjs/common';
import { ApiController } from './api.controller';
import { ApiService } from './api.service';
import { ApiKeyGuard } from './api-key.guard';
import { ApiKeyThrottlerGuard } from './api-key-throttler.guard';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ApiController],
  providers: [ApiService, ApiKeyGuard, ApiKeyThrottlerGuard, PrismaService],
  exports: [ApiService],
})
export class ApiModule {}
