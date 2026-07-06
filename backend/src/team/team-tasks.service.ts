import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TeamTaskPriority, TeamTaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

// ── DTOs ─────────────────────────────────────────────────────────────────
export class CreateTaskDto {
  title: string;
  description?: string;
  assignedToId: string;
  priority?: TeamTaskPriority;
  deadline?: string;
  projectTag?: string;
}

export class UpdateTaskDto {
  title?: string;
  description?: string;
  assignedToId?: string;
  priority?: TeamTaskPriority;
  deadline?: string;
  projectTag?: string;
}

export class UpdateTaskStatusDto {
  status: TeamTaskStatus;
}

export class CreateTaskCommentDto {
  content: string;
}

const PRIVILEGED_TASK_ROLES = ['SUPER_ADMIN', 'COO', 'AGENT_MANAGER'];

@Injectable()
export class TeamTasksService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  async listTasks(filters: { assignedTo?: string; status?: TeamTaskStatus; priority?: TeamTaskPriority; projectTag?: string }) {
    return this.prisma.teamTask.findMany({
      where: {
        assignedToId: filters.assignedTo,
        status: filters.status,
        priority: filters.priority,
        projectTag: filters.projectTag,
      },
      include: {
        assignedTo: { select: { id: true, displayName: true, avatar: true } },
        assignedBy: { select: { id: true, displayName: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTask(dto: CreateTaskDto, assignedById: string) {
    const task = await this.prisma.teamTask.create({
      data: {
        title: dto.title,
        description: dto.description,
        assignedToId: dto.assignedToId,
        assignedById,
        priority: dto.priority ?? 'NORMAL',
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
        projectTag: dto.projectTag,
      },
      include: {
        assignedTo: { select: { id: true, displayName: true, userId: true } },
      },
    });

    await this.prisma.teamNotification.create({
      data: {
        recipientId: dto.assignedToId,
        type: 'TASK',
        title: 'Nouvo tach asiye',
        content: dto.title,
        link: `/team/tasks`,
      },
    });

    const assigneeUser = await this.prisma.user.findUnique({ where: { id: task.assignedTo.userId } });
    if (assigneeUser) {
      await this.mail.sendTeamTaskAssigned(
        assigneeUser.email,
        task.assignedTo.displayName,
        task.title,
        task.description ?? '',
        task.priority,
        task.deadline,
      );
    }

    return task;
  }

  async updateTask(id: string, dto: UpdateTaskDto) {
    await this.assertTaskExists(id);
    return this.prisma.teamTask.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        assignedToId: dto.assignedToId,
        priority: dto.priority,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
        projectTag: dto.projectTag,
      },
    });
  }

  async updateStatus(id: string, status: TeamTaskStatus, requesterTeamMemberId: string, requesterRole: string) {
    const task = await this.assertTaskExists(id);
    const isAssignee = task.assignedToId === requesterTeamMemberId;
    const isPrivileged = PRIVILEGED_TASK_ROLES.includes(requesterRole);
    if (!isAssignee && !isPrivileged) {
      throw new ForbiddenException('Sèlman moun ki asiye tach la ka chanje estati li.');
    }
    return this.prisma.teamTask.update({ where: { id }, data: { status } });
  }

  async deleteTask(id: string) {
    await this.assertTaskExists(id);
    await this.prisma.teamTaskComment.deleteMany({ where: { taskId: id } });
    await this.prisma.teamFile.updateMany({ where: { taskId: id }, data: { taskId: null } });
    await this.prisma.teamTask.delete({ where: { id } });
    return { message: 'Tach efase.' };
  }

  async listComments(taskId: string) {
    await this.assertTaskExists(taskId);
    return this.prisma.teamTaskComment.findMany({
      where: { taskId },
      include: { author: { select: { id: true, displayName: true, avatar: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addComment(taskId: string, authorId: string, dto: CreateTaskCommentDto) {
    await this.assertTaskExists(taskId);
    return this.prisma.teamTaskComment.create({
      data: { taskId, authorId, content: dto.content },
      include: { author: { select: { id: true, displayName: true, avatar: true } } },
    });
  }

  private async assertTaskExists(id: string) {
    const task = await this.prisma.teamTask.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Tach sa pa egziste.');
    return task;
  }
}
