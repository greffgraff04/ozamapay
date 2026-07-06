import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TeamFileCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ImageKitService } from '../imagekit/imagekit.service';

export class UploadTeamFileDto {
  category?: TeamFileCategory;
  description?: string;
  taskId?: string;
}

@Injectable()
export class TeamFilesService {
  constructor(
    private prisma: PrismaService,
    private imagekit: ImageKitService,
  ) {}

  async listFiles(filters: { category?: TeamFileCategory; uploadedBy?: string }) {
    return this.prisma.teamFile.findMany({
      where: { category: filters.category, uploadedById: filters.uploadedBy },
      include: { uploadedBy: { select: { id: true, displayName: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async upload(file: Express.Multer.File, uploadedById: string, dto: UploadTeamFileDto) {
    const url = await this.imagekit.uploadFile(file, 'team-files');
    return this.prisma.teamFile.create({
      data: {
        name: file.originalname,
        url,
        size: file.size,
        mimeType: file.mimetype,
        uploadedById,
        category: dto.category ?? 'OTHER',
        description: dto.description,
        taskId: dto.taskId,
      },
      include: { uploadedBy: { select: { id: true, displayName: true, avatar: true } } },
    });
  }

  async deleteFile(id: string, requesterTeamMemberId: string, requesterRole: string) {
    const file = await this.prisma.teamFile.findUnique({ where: { id } });
    if (!file) throw new NotFoundException('Fichye sa pa egziste.');

    const isOwner = file.uploadedById === requesterTeamMemberId;
    const isPrivileged = requesterRole === 'SUPER_ADMIN' || requesterRole === 'COO';
    if (!isOwner && !isPrivileged) {
      throw new ForbiddenException('Ou pa ka efase fichye sa.');
    }

    await this.prisma.teamFile.delete({ where: { id } });
    return { message: 'Fichye efase.' };
  }
}
