import { Module } from '@nestjs/common';
import { ActivationService } from './activation.service';
import { ActivationGuard } from './activation.guard';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ActivationService, ActivationGuard],
  exports: [ActivationService, ActivationGuard],
})
export class ActivationModule {}
