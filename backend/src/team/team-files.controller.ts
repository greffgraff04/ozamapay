import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Request,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { TeamFileCategory } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TeamAuthGuard } from './guards/team-auth.guard';
import { TeamMemberGuard } from './guards/team-member.guard';
import { TeamFilesService, UploadTeamFileDto } from './team-files.service';

@UseGuards(JwtAuthGuard, TeamAuthGuard, TeamMemberGuard)
@Controller('team/files')
export class TeamFilesController {
  constructor(private readonly teamFilesService: TeamFilesService) {}

  @Get()
  listFiles(@Query('category') category?: TeamFileCategory, @Query('uploadedBy') uploadedBy?: string) {
    return this.teamFilesService.listFiles({ category, uploadedBy });
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 },
  }))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadTeamFileDto,
    @Request() req,
  ) {
    if (!file) throw new BadRequestException('Ou dwe voye yon fichye.');
    return this.teamFilesService.upload(file, req.teamMember.id, dto);
  }

  @Delete(':id')
  deleteFile(@Param('id') id: string, @Request() req) {
    return this.teamFilesService.deleteFile(id, req.teamMember.id, req.teamMember.role);
  }
}
