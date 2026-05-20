import { Controller, Post, Get, Body, UseInterceptors, UploadedFiles, Req, UseGuards } from '@nestjs/common';
import { UserService } from './users.service';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('submit-kyc')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'idCardFile', maxCount: 1 },
      { name: 'userPhotoFile', maxCount: 1 },
    ]),
  )
  async submitKyc(
    @Req() req: any,
    @Body('idType') idType: string,
    @Body('idNumber') idNumber: string,
    @Body('additionalData') additionalDataString: string, // <-- Rekipere string data a isit la
    @UploadedFiles() files: { idCardFile?: any[]; userPhotoFile?: any[] },
  ) {
    const userId = req.user.id || req.user.sub;
    
    // Konvèti string additionalData a an objè JSON valid pou sèvis la
    let parsedAdditionalData = {};
    if (additionalDataString) {
      try {
        parsedAdditionalData = JSON.parse(additionalDataString);
      } catch (e) {
        console.error("Erè parsing additionalData string:", e);
      }
    }

    return this.userService.submitKyc(userId, idType, idNumber, files, parsedAdditionalData);
  }

  @Get('pending-kyc')
  async getPendingKyc() {
    return this.userService.getPendingKyc();
  }

  @Post('review-kyc')
  async reviewKyc(
    @Body('userId') userId: string,
    @Body('action') action: 'APPROVE' | 'REJECT'
  ) {
    return this.userService.reviewKyc(userId, action);
  }
}