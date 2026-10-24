import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminSetupController } from './admin-setup.controller';
import { AdminStatsController } from './admin-stats.controller';
import { AgentAdminController } from './agent-admin.controller';
import { PrismaService } from '../prisma/prisma.service';
import { MailModule } from '../mail/mail.module';
import { KycModule } from '../kyc/kyc.module';

@Module({
  imports: [MailModule, KycModule],
  controllers: [AdminController, AdminSetupController, AdminStatsController, AgentAdminController],
  providers: [AdminService, PrismaService],
})
export class AdminModule {}