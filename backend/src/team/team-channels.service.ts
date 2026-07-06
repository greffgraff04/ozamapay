import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TeamChannelType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// ── DTOs ─────────────────────────────────────────────────────────────────
export class CreateChannelDto {
  name: string;
  description?: string;
  type: TeamChannelType;
  memberIds?: string[];
}

export class PostMessageDto {
  content: string;
  fileUrl?: string;
  fileType?: string;
  replyToId?: string;
}

@Injectable()
export class TeamChannelsService {
  constructor(private prisma: PrismaService) {}

  async listChannels(teamMemberId: string, isPrivileged = false) {
    return this.prisma.teamChannel.findMany({
      where: isPrivileged ? {} : {
        OR: [
          { type: 'PUBLIC' },
          { members: { some: { id: teamMemberId } } },
        ],
      },
      include: {
        _count: { select: { messages: true } },
        members: { select: { id: true, displayName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createChannel(dto: CreateChannelDto, createdById: string) {
    const memberIds = Array.from(new Set([...(dto.memberIds ?? []), createdById]));
    return this.prisma.teamChannel.create({
      data: {
        name: dto.name,
        description: dto.description,
        type: dto.type,
        createdById,
        members: { connect: memberIds.map(id => ({ id })) },
      },
      include: { members: { select: { id: true, displayName: true } } },
    });
  }

  async deleteChannel(channelId: string) {
    const channel = await this.prisma.teamChannel.findUnique({ where: { id: channelId } });
    if (!channel) throw new NotFoundException('Chanèl sa pa egziste.');
    await this.prisma.teamMessage.deleteMany({ where: { channelId } });
    await this.prisma.teamChannel.delete({ where: { id: channelId } });
    return { message: 'Chanèl efase.' };
  }

  async listMessages(channelId: string, teamMemberId: string, limit = 50, before?: string) {
    await this.assertChannelAccess(channelId, teamMemberId);

    const messages = await this.prisma.teamMessage.findMany({
      where: {
        channelId,
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      include: {
        sender: { select: { id: true, displayName: true, avatar: true, role: true } },
        replyTo: { select: { id: true, content: true, senderId: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return messages.reverse();
  }

  async postMessage(channelId: string, senderId: string, dto: PostMessageDto) {
    const channel = await this.assertChannelAccess(channelId, senderId);

    const message = await this.prisma.teamMessage.create({
      data: {
        channelId,
        senderId,
        content: dto.content,
        fileUrl: dto.fileUrl,
        fileType: dto.fileType,
        replyToId: dto.replyToId,
      },
      include: {
        sender: { select: { id: true, displayName: true, avatar: true, role: true } },
      },
    });

    const recipientIds = channel.members
      .map(m => m.id)
      .filter(id => id !== senderId);

    if (recipientIds.length > 0) {
      await this.prisma.teamNotification.createMany({
        data: recipientIds.map(recipientId => ({
          recipientId,
          type: 'MESSAGE' as const,
          title: channel.name,
          content: dto.content.slice(0, 140),
          link: `/team/messages?channel=${channelId}`,
        })),
      });
    }

    return message;
  }

  async deleteMessage(messageId: string, requesterTeamMemberId: string, requesterRole: string) {
    const message = await this.prisma.teamMessage.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Mesaj sa pa egziste.');

    const isOwner = message.senderId === requesterTeamMemberId;
    const isPrivileged = requesterRole === 'SUPER_ADMIN' || requesterRole === 'COO';
    if (!isOwner && !isPrivileged) {
      throw new ForbiddenException('Ou pa ka efase mesaj sa.');
    }

    await this.prisma.teamMessage.delete({ where: { id: messageId } });
    return { message: 'Mesaj efase.' };
  }

  private async assertChannelAccess(channelId: string, teamMemberId: string) {
    const channel = await this.prisma.teamChannel.findUnique({
      where: { id: channelId },
      include: { members: { select: { id: true } } },
    });
    if (!channel) throw new NotFoundException('Chanèl sa pa egziste.');

    const isMember = channel.members.some(m => m.id === teamMemberId);
    if (channel.type !== 'PUBLIC' && !isMember) {
      throw new ForbiddenException('Ou pa gen aksè nan chanèl sa.');
    }
    return channel;
  }
}
