import { Module } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';
import { PrismaService } from '../prisma/prisma.service';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [MailModule],
  controllers: [AgentsController],
  providers: [AgentsService, PrismaService],
})
export class AgentsModule {}