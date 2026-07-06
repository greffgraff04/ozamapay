import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailModule } from '../mail/mail.module';
import { ImageKitModule } from '../imagekit/imagekit.module';

import { TeamAuthGuard } from './guards/team-auth.guard';
import { TeamMemberGuard } from './guards/team-member.guard';
import { TeamRolesGuard } from './guards/team-roles.guard';

import { TeamMembersController } from './team-members.controller';
import { TeamMembersService } from './team-members.service';
import { TeamChannelsController } from './team-channels.controller';
import { TeamChannelsService } from './team-channels.service';
import { TeamTasksController } from './team-tasks.controller';
import { TeamTasksService } from './team-tasks.service';
import { TeamFilesController } from './team-files.controller';
import { TeamFilesService } from './team-files.service';
import { TeamReportsController } from './team-reports.controller';
import { TeamReportsService } from './team-reports.service';
import { TeamAnnouncementsController } from './team-announcements.controller';
import { TeamAnnouncementsService } from './team-announcements.service';
import { TeamCalendarController } from './team-calendar.controller';
import { TeamCalendarService } from './team-calendar.service';
import { TeamNotificationsController } from './team-notifications.controller';
import { TeamNotificationsService } from './team-notifications.service';
import { TeamMeetingReminderService } from './team-meeting-reminder.service';

@Module({
  imports: [MailModule, ImageKitModule],
  controllers: [
    TeamMembersController,
    TeamChannelsController,
    TeamTasksController,
    TeamFilesController,
    TeamReportsController,
    TeamAnnouncementsController,
    TeamCalendarController,
    TeamNotificationsController,
  ],
  providers: [
    PrismaService,
    TeamAuthGuard,
    TeamMemberGuard,
    TeamRolesGuard,
    TeamMembersService,
    TeamChannelsService,
    TeamTasksService,
    TeamFilesService,
    TeamReportsService,
    TeamAnnouncementsService,
    TeamCalendarService,
    TeamNotificationsService,
    TeamMeetingReminderService,
  ],
})
export class TeamModule {}
