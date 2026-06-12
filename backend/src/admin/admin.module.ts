import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminSetupController } from './admin-setup.controller';
import { PrismaService } from '../prisma/prisma.service';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [MailModule],
  controllers: [AdminController, AdminSetupController],
  providers: [AdminService, PrismaService],
})
export class AdminModule {}