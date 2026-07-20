import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { TronController } from './tron.controller';
import { SweepController } from './sweep.controller';
import { TronAddressService } from './tron-address.service';
import { TronMonitorService } from './tron-monitor.service';
import { SweepService } from './sweep.service';

@Module({
  imports: [PrismaModule, AuthModule, MailModule],
  controllers: [TronController, SweepController],
  providers: [TronAddressService, TronMonitorService, SweepService],
  exports: [TronAddressService],
})
export class TronModule {}
