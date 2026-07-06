import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TeamNotificationsService {
  constructor(private prisma: PrismaService) {}

  async listNotifications(recipientId: string, limit = 20, unreadOnly = false) {
    return this.prisma.teamNotification.findMany({
      where: { recipientId, ...(unreadOnly ? { isRead: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async markAllRead(recipientId: string) {
    await this.prisma.teamNotification.updateMany({
      where: { recipientId, isRead: false },
      data: { isRead: true },
    });
    return { message: 'Tout notifikasyon make kòm li.' };
  }

  async markOneRead(id: string, recipientId: string) {
    await this.prisma.teamNotification.updateMany({
      where: { id, recipientId },
      data: { isRead: true },
    });
    return { message: 'Notifikasyon make kòm li.' };
  }

  async countUnread(recipientId: string) {
    const count = await this.prisma.teamNotification.count({
      where: { recipientId, isRead: false },
    });
    return { count };
  }
}
