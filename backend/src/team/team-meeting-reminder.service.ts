import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class TeamMeetingReminderService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  // Every minute: catch meetings starting within the next 30 minutes that
  // haven't been reminded yet. reminderSent gates this so we never double-send.
  @Cron(CronExpression.EVERY_MINUTE)
  async sendUpcomingMeetingReminders() {
    const now = new Date();
    const in30Min = new Date(now.getTime() + 30 * 60 * 1000);

    const dueMeetings = await this.prisma.teamCalendarEvent.findMany({
      where: {
        type: 'MEETING',
        isJitsiMeeting: true,
        reminderSent: false,
        startAt: { gte: now, lte: in30Min },
      },
      include: {
        attendees: { include: { user: { select: { email: true } } } },
      },
    });

    for (const meeting of dueMeetings) {
      for (const attendee of meeting.attendees) {
        if (attendee.user?.email && meeting.meetingUrl) {
          await this.mail.sendTeamMeetingReminder(
            attendee.user.email,
            attendee.displayName,
            meeting.title,
            meeting.startAt,
            meeting.meetingUrl,
          );
        }
      }
      await this.prisma.teamCalendarEvent.update({
        where: { id: meeting.id },
        data: { reminderSent: true },
      });
    }
  }
}
