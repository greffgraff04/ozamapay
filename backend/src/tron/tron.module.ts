import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { TronController } from './tron.controller';
import { TronAddressService } from './tron-address.service';
import { TronMonitorService } from './tron-monitor.service';

@Module({
  imports: [PrismaModule, AuthModule, MailModule],
  controllers: [TronController],
  providers: [TronAddressService, TronMonitorService],
  exports: [TronAddressService],
})
export class TronModule {}
