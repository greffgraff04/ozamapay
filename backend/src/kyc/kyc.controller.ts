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
import { diskStorage } from 'multer';
import { extname } from 'path';
import { KycService } from './kyc.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('kyc')
@UseGuards(JwtAuthGuard)
export class KycController {
  constructor(private kycService: KycService) {}

  @Post('submit')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'idCardFile', maxCount: 1 },
        { name: 'userPhotoFile', maxCount: 1 },
      ],
      {
        storage: diskStorage({
          destination: './uploads/kyc',
          filename: (req, file, cb) => {
            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            cb(null, `kyc-${uniqueSuffix}${extname(file.originalname)}`);
          },
        }),
        limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
        fileFilter: (req, file, cb) => {
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

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:10000';

    const idImageUrl = files.idCardFile?.[0]?.filename
      ? `${backendUrl}/uploads/kyc/${files.idCardFile[0].filename}`
      : '';

    const userPhotoUrl = files.userPhotoFile?.[0]?.filename
      ? `${backendUrl}/uploads/kyc/${files.userPhotoFile[0].filename}`
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
  approve(@Param('userId') userId: string) {
    return this.kycService.approveKyc(userId);
  }

  @Post('reject/:userId')
  reject(@Param('userId') userId: string) {
    return this.kycService.rejectKyc(userId);
  }
}