import { Injectable, NotFoundException } from '@nestjs/common';
import { TeamAnnouncementPriority } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// ── DTOs ─────────────────────────────────────────────────────────────────
export class CreateAnnouncementDto {
  title: string;
  content: string;
  priority?: TeamAnnouncementPriority;
}

@Injectable()
export class TeamAnnouncementsService {
  constructor(private prisma: PrismaService) {}

  async listAnnouncements() {
    return this.prisma.teamAnnouncement.findMany({
      include: { author: { select: { id: true, displayName: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAnnouncement(dto: CreateAnnouncementDto, authorId: string) {
    const priority = dto.priority ?? 'NORMAL';
    const announcement = await this.prisma.teamAnnouncement.create({
      data: { title: dto.title, content: dto.content, priority, authorId },
      include: { author: { select: { id: true, displayName: true } } },
    });

    if (priority === 'URGENT' || priority === 'IMPORTANT') {
      const members = await this.prisma.teamMember.findMany({
        where: { isActive: true, id: { not: authorId } },
      });
      if (members.length > 0) {
        await this.prisma.teamNotification.createMany({
          data: members.map(m => ({
            recipientId: m.id,
            type: 'ANNOUNCEMENT' as const,
            title: dto.title,
            content: dto.content.slice(0, 140),
            link: `/team/announcements`,
          })),
        });
      }
    }

    return announcement;
  }

  async deleteAnnouncement(id: string) {
    const announcement = await this.prisma.teamAnnouncement.findUnique({ where: { id } });
    if (!announcement) throw new NotFoundException('Anonsman sa pa egziste.');
    await this.prisma.teamAnnouncement.delete({ where: { id } });
    return { message: 'Anonsman efase.' };
  }
}
