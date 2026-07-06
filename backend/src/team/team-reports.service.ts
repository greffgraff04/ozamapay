import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TeamReportStatus, TeamReportType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

// ── DTOs ─────────────────────────────────────────────────────────────────
export class CreateReportDto {
  title: string;
  type: TeamReportType;
  content: string;
  status?: TeamReportStatus; // DRAFT (default) or SUBMITTED
}

export class UpdateReportDto {
  title?: string;
  content?: string;
  status?: TeamReportStatus;
}

export class ReviewReportDto {
  status: 'APPROVED' | 'REJECTED' | 'REVIEWED';
  reviewNote?: string;
}

const PRIVILEGED_REPORT_ROLES = ['SUPER_ADMIN', 'COO'];

@Injectable()
export class TeamReportsService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  async listReports(requesterTeamMemberId: string, requesterRole: string) {
    const isPrivileged = PRIVILEGED_REPORT_ROLES.includes(requesterRole);
    return this.prisma.teamReport.findMany({
      where: isPrivileged ? {} : { authorId: requesterTeamMemberId },
      include: { author: { select: { id: true, displayName: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createReport(dto: CreateReportDto, authorId: string) {
    const status = dto.status ?? 'DRAFT';
    const report = await this.prisma.teamReport.create({
      data: {
        title: dto.title,
        type: dto.type,
        content: dto.content,
        status,
        authorId,
        submittedAt: status === 'SUBMITTED' ? new Date() : undefined,
      },
      include: { author: { select: { id: true, displayName: true } } },
    });

    if (status === 'SUBMITTED') {
      const reviewers = await this.prisma.teamMember.findMany({
        where: { role: { in: ['SUPER_ADMIN', 'COO'] } },
      });
      if (reviewers.length > 0) {
        await this.prisma.teamNotification.createMany({
          data: reviewers.map(r => ({
            recipientId: r.id,
            type: 'REPORT' as const,
            title: 'Nouvo rapò soumèt',
            content: dto.title,
            link: `/team/reports`,
          })),
        });
      }
    }

    return report;
  }

  async updateReport(id: string, dto: UpdateReportDto, requesterTeamMemberId: string) {
    const report = await this.assertReportExists(id);
    if (report.authorId !== requesterTeamMemberId) {
      throw new ForbiddenException('Ou pa ka modifye rapò yon lòt moun.');
    }
    if (report.status !== 'DRAFT') {
      throw new BadRequestException('Ou ka modifye rapò a sèlman si li DRAFT.');
    }

    const nowSubmitting = dto.status === 'SUBMITTED';
    const updated = await this.prisma.teamReport.update({
      where: { id },
      data: {
        title: dto.title,
        content: dto.content,
        status: dto.status,
        submittedAt: nowSubmitting ? new Date() : undefined,
      },
    });

    if (nowSubmitting) {
      const reviewers = await this.prisma.teamMember.findMany({
        where: { role: { in: ['SUPER_ADMIN', 'COO'] } },
      });
      if (reviewers.length > 0) {
        await this.prisma.teamNotification.createMany({
          data: reviewers.map(r => ({
            recipientId: r.id,
            type: 'REPORT' as const,
            title: 'Nouvo rapò soumèt',
            content: updated.title,
            link: `/team/reports`,
          })),
        });
      }
    }

    return updated;
  }

  async reviewReport(id: string, dto: ReviewReportDto) {
    const report = await this.assertReportExists(id);
    const updated = await this.prisma.teamReport.update({
      where: { id },
      data: { status: dto.status, reviewNote: dto.reviewNote, reviewedAt: new Date() },
      include: { author: { include: { user: { select: { email: true } } } } },
    });

    await this.prisma.teamNotification.create({
      data: {
        recipientId: report.authorId,
        type: 'REPORT',
        title: `Rapò ou ${dto.status === 'APPROVED' ? 'apwouve' : dto.status === 'REJECTED' ? 'rejte' : 'revize'}`,
        content: updated.title,
        link: `/team/reports`,
      },
    });

    if (updated.author.user?.email) {
      await this.mail.sendTeamReportReviewed(
        updated.author.user.email,
        updated.author.displayName,
        updated.title,
        dto.status,
        dto.reviewNote,
      );
    }

    return updated;
  }

  private async assertReportExists(id: string) {
    const report = await this.prisma.teamReport.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Rapò sa pa egziste.');
    return report;
  }
}
