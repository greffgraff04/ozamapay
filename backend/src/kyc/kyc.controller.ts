import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Param,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { KycService } from './kyc.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../admin/admin.guard';
import { ImageKitService } from '../imagekit/imagekit.service';

@Controller('kyc')
@UseGuards(JwtAuthGuard)
export class KycController {
  constructor(
    private kycService: KycService,
    private imagekitService: ImageKitService,
  ) {}

  @Post('submit')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'idCardFile', maxCount: 1 },
        { name: 'userPhotoFile', maxCount: 1 },
      ],
      {
        storage: memoryStorage(),
        limits: { fileSize: 10 * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
          if (file.mimetype.match(/^image\/(jpeg|jpg|png|webp)$/)) {
            cb(null, true);
          } else {
            cb(new Error('Sèlman imaj JPEG, PNG, WEBP ki aksepte'), false);
          }
        },
      },
    ),
  )
  async submit(
    @Request() req: any,
    @UploadedFiles() files: {
      idCardFile?: Express.Multer.File[];
      userPhotoFile?: Express.Multer.File[];
    },
    @Body() body: any,
  ) {
    const parsedData = JSON.parse(body.additionalData);

    const idImageUrl = files.idCardFile?.[0]
      ? await this.imagekitService.uploadFile(files.idCardFile[0], 'kyc')
      : '';

    const userPhotoUrl = files.userPhotoFile?.[0]
      ? await this.imagekitService.uploadFile(files.userPhotoFile[0], 'kyc')
      : '';

    return this.kycService.submitKyc(req.user.id, {
      ...parsedData,
      idType: body.idType,
      idNumber: body.idNumber,
      idImage: idImageUrl,
      userPhoto: userPhotoUrl,
    });
  }

  @Get('status')
  getStatus(@Request() req: any) {
    return this.kycService.getKycStatus(req.user.id);
  }

  @Post('approve/:userId')
  @UseGuards(AdminGuard)
  approve(@Param('userId') userId: string) {
    return this.kycService.approveKyc(userId);
  }

  @Post('reject/:userId')
  @UseGuards(AdminGuard)
  reject(@Param('userId') userId: string) {
    return this.kycService.rejectKyc(userId);
  }
}
