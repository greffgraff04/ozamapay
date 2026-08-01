import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { TronController } from './tron.controller';
import { SweepController } from './sweep.controller';
import { ReconciliationController } from './reconciliation.controller';
import { TronAddressService } from './tron-address.service';
import { TronMonitorService } from './tron-monitor.service';
import { SweepService } from './sweep.service';
import { ReconciliationService } from './reconciliation.service';
import { TronUsageService } from './tron-usage.service';
import { TronHealthService } from './tron-health.service';

@Module({
  imports: [PrismaModule, AuthModule, MailModule],
  controllers: [TronController, SweepController, ReconciliationController],
  providers: [
    TronAddressService,
    TronMonitorService,
    SweepService,
    ReconciliationService,
    TronUsageService,
    TronHealthService,
  ],
  exports: [TronAddressService],
})
export class TronModule {}
