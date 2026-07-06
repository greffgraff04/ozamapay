import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TeamCalendarEventType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';

// ── DTOs ─────────────────────────────────────────────────────────────────
export class CreateCalendarEventDto {
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  type: TeamCalendarEventType;
  attendeeIds?: string[];
}

export class UpdateCalendarEventDto {
  title?: string;
  description?: string;
  startAt?: string;
  endAt?: string;
  type?: TeamCalendarEventType;
  attendeeIds?: string[];
}

@Injectable()
export class TeamCalendarService {
  constructor(private prisma: PrismaService) {}

  async listEvents(month?: number, year?: number) {
    const where: any = {};
    if (month && year) {
      const start = new Date(Date.UTC(year, month - 1, 1));
      const end = new Date(Date.UTC(year, month, 1));
      where.startAt = { gte: start, lt: end };
    }
    return this.prisma.teamCalendarEvent.findMany({
      where,
      include: {
        createdBy: { select: { id: true, displayName: true } },
        attendees: { select: { id: true, displayName: true, avatar: true } },
      },
      orderBy: { startAt: 'asc' },
    });
  }

  async createEvent(dto: CreateCalendarEventDto, createdById: string) {
    const isMeeting = dto.type === 'MEETING';
    const jitsiRoomId = isMeeting ? uuidv4() : undefined;
    const meetingUrl = isMeeting ? `https://meet.jit.si/ozamapay-${jitsiRoomId}` : undefined;

    const attendeeIds = Array.from(new Set([...(dto.attendeeIds ?? []), createdById]));

    const event = await this.prisma.teamCalendarEvent.create({
      data: {
        title: dto.title,
        description: dto.description,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        type: dto.type,
        createdById,
        isJitsiMeeting: isMeeting,
        jitsiRoomId,
        meetingUrl,
        attendees: { connect: attendeeIds.map(id => ({ id })) },
      },
      include: { attendees: { select: { id: true, displayName: true } } },
    });

    const recipientIds = attendeeIds.filter(id => id !== createdById);
    if (recipientIds.length > 0) {
      await this.prisma.teamNotification.createMany({
        data: recipientIds.map(recipientId => ({
          recipientId,
          type: isMeeting ? ('MEETING' as const) : ('CALENDAR' as const),
          title: isMeeting ? `Envite nan reyinyon: ${dto.title}` : `Nouvo evènman: ${dto.title}`,
          content: dto.description ?? '',
          link: `/team/calendar`,
        })),
      });
    }

    return event;
  }

  async updateEvent(id: string, dto: UpdateCalendarEventDto, requesterTeamMemberId: string, requesterRole: string) {
    const event = await this.assertEventExists(id);
    this.assertCanModify(event, requesterTeamMemberId, requesterRole);

    return this.prisma.teamCalendarEvent.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        startAt: dto.startAt ? new Date(dto.startAt) : undefined,
        endAt: dto.endAt ? new Date(dto.endAt) : undefined,
        type: dto.type,
        attendees: dto.attendeeIds ? { set: dto.attendeeIds.map(aid => ({ id: aid })) } : undefined,
      },
    });
  }

  async deleteEvent(id: string, requesterTeamMemberId: string, requesterRole: string) {
    const event = await this.assertEventExists(id);
    this.assertCanModify(event, requesterTeamMemberId, requesterRole);
    await this.prisma.teamCalendarEvent.delete({ where: { id } });
    return { message: 'Evènman efase.' };
  }

  async joinEvent(id: string, requesterTeamMemberId: string) {
    const event = await this.prisma.teamCalendarEvent.findUnique({
      where: { id },
      include: { attendees: { select: { id: true } } },
    });
    if (!event) throw new NotFoundException('Evènman sa pa egziste.');
    if (!event.isJitsiMeeting || !event.meetingUrl) {
      throw new ForbiddenException('Evènman sa pa yon reyinyon Jitsi.');
    }
    const isAttendee = event.attendees.some(a => a.id === requesterTeamMemberId);
    if (!isAttendee) {
      throw new ForbiddenException('Ou pa envite nan reyinyon sa.');
    }
    return { meetingUrl: event.meetingUrl, roomId: event.jitsiRoomId };
  }

  private async assertEventExists(id: string) {
    const event = await this.prisma.teamCalendarEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Evènman sa pa egziste.');
    return event;
  }

  private assertCanModify(event: { createdById: string }, requesterTeamMemberId: string, requesterRole: string) {
    const isCreator = event.createdById === requesterTeamMemberId;
    const isPrivileged = requesterRole === 'SUPER_ADMIN' || requesterRole === 'COO';
    if (!isCreator && !isPrivileged) {
      throw new ForbiddenException('Ou pa ka modifye evènman sa.');
    }
  }
}
