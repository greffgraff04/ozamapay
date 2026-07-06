import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TeamRole } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

const INVITATION_TTL_MS = 48 * 60 * 60 * 1000; // 48h per spec
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://ozamapay.com';

// ── DTOs ─────────────────────────────────────────────────────────────────
export class InviteTeamMemberDto {
  email: string;
  role: TeamRole;
  displayName: string;
}

export class ChangeTeamMemberRoleDto {
  role: TeamRole;
}

export class DeactivateTeamMemberDto {
  isActive?: boolean;
}

@Injectable()
export class TeamMembersService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  async acceptInvitation(token: string, userId: string, userEmail: string) {
    const invitation = await this.prisma.teamInvitation.findUnique({ where: { token } });
    if (!invitation) throw new NotFoundException('Envitasyon sa pa egziste.');
    if (invitation.accepted) throw new BadRequestException('Envitasyon sa deja itilize.');
    if (invitation.expiresAt < new Date()) throw new BadRequestException('Envitasyon sa ekspire.');
    if (invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
      throw new ForbiddenException('Envitasyon sa pa pou kont ou.');
    }

    const existing = await this.prisma.teamMember.findUnique({ where: { userId } });
    if (existing) throw new BadRequestException('Ou deja yon manm ekip la.');

    const [member] = await this.prisma.$transaction([
      this.prisma.teamMember.create({
        data: {
          userId,
          role: invitation.role,
          displayName: invitation.displayName,
        },
      }),
      this.prisma.teamInvitation.update({
        where: { token },
        data: { accepted: true },
      }),
    ]);

    return member;
  }

  async invite(dto: InviteTeamMemberDto, invitedById: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { teamMember: true },
    });
    if (existingUser?.teamMember) {
      throw new BadRequestException('Moun sa deja yon manm ekip la.');
    }

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);

    await this.prisma.teamInvitation.upsert({
      where: { email: dto.email },
      create: {
        email: dto.email,
        role: dto.role,
        displayName: dto.displayName,
        token,
        expiresAt,
        invitedById,
      },
      update: {
        role: dto.role,
        displayName: dto.displayName,
        token,
        expiresAt,
        accepted: false,
        invitedById,
      },
    });

    const joinLink = `${FRONTEND_URL}/team/join/${token}`;
    await this.mail.sendTeamInvitation(dto.email, dto.role, joinLink);

    return { message: 'Envitasyon voye.', email: dto.email, role: dto.role, expiresAt };
  }

  async listMembers() {
    return this.prisma.teamMember.findMany({
      include: { user: { select: { email: true, name: true, photoUrl: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getMe(userId: string) {
    const member = await this.prisma.teamMember.findUnique({
      where: { userId },
      include: { user: { select: { email: true, name: true, photoUrl: true } } },
    });
    if (!member) throw new NotFoundException('Ou pa yon manm ekip la.');
    return member;
  }

  async changeRole(id: string, role: TeamRole) {
    await this.assertMemberExists(id);
    return this.prisma.teamMember.update({ where: { id }, data: { role } });
  }

  async setActive(id: string, isActive: boolean) {
    await this.assertMemberExists(id);
    return this.prisma.teamMember.update({ where: { id }, data: { isActive } });
  }

  private async assertMemberExists(id: string) {
    const member = await this.prisma.teamMember.findUnique({ where: { id } });
    if (!member) throw new NotFoundException('Manm ekip sa pa egziste.');
    return member;
  }

  async getDashboard(teamMemberId: string) {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [
      pendingTasksCount,
      urgentTasks,
      reportsThisWeekCount,
      weekEvents,
      recentAnnouncements,
      unreadNotificationsCount,
    ] = await Promise.all([
      this.prisma.teamTask.count({
        where: { assignedToId: teamMemberId, status: { not: 'FINI' } },
      }),
      this.prisma.teamTask.findMany({
        where: {
          assignedToId: teamMemberId,
          priority: 'URGENT',
          status: { not: 'FINI' },
          deadline: { lte: in48h, gte: now },
        },
        orderBy: { deadline: 'asc' },
        take: 10,
      }),
      this.prisma.teamReport.count({
        where: { submittedAt: { gte: startOfWeek } },
      }),
      this.prisma.teamCalendarEvent.findMany({
        where: {
          startAt: { gte: now, lte: in7d },
          attendees: { some: { id: teamMemberId } },
        },
        orderBy: { startAt: 'asc' },
        take: 20,
      }),
      this.prisma.teamAnnouncement.findMany({
        orderBy: { createdAt: 'desc' },
        take: 3,
      }),
      this.prisma.teamNotification.count({
        where: { recipientId: teamMemberId, isRead: false },
      }),
    ]);

    const [recentTasks, recentReports] = await Promise.all([
      this.prisma.teamTask.findMany({ orderBy: { updatedAt: 'desc' }, take: 5 }),
      this.prisma.teamReport.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
    ]);
    const recentActivity = [
      ...recentTasks.map(t => ({ type: 'TASK', id: t.id, title: t.title, at: t.updatedAt })),
      ...recentReports.map(r => ({ type: 'REPORT', id: r.id, title: r.title, at: r.createdAt })),
      ...recentAnnouncements.map(a => ({ type: 'ANNOUNCEMENT', id: a.id, title: a.title, at: a.createdAt })),
    ].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 10);

    return {
      pendingTasksCount,
      urgentTasks,
      reportsThisWeekCount,
      weekEvents,
      recentAnnouncements,
      unreadNotificationsCount,
      recentActivity,
    };
  }
}
