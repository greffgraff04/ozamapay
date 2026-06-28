import { Module } from '@nestjs/common';
import { BusinessService } from './business.service';
import { BusinessController } from './business.controller';
import { PrismaService } from '../prisma/prisma.service';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [MailModule],
  controllers: [BusinessController],
  providers: [BusinessService, PrismaService],
  exports: [BusinessService],
})
export class BusinessModule {}
