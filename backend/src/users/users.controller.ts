import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UserService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ImageKitService } from '../imagekit/imagekit.service';

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly imagekitService: ImageKitService,
  ) {}

  @Post('change-pin')
  @HttpCode(HttpStatus.OK)
  async changePin(@Req() req: any, @Body() body: { newPin: string }) {
    const userId = req.user.id || req.user.sub;
    return this.userService.updateTransactionPin(userId, body.newPin);
  }

  @Get('agent/profile')
  async getAgentProfile(@Req() req: any) {
    const userId = req.user.id || req.user.sub;
    return this.userService.getAgentProfile(userId);
  }

  @Post('agent/topup')
  @HttpCode(HttpStatus.OK)
  async agentTopup(@Req() req: any, @Body() body: { amount: number }) {
    const userId = req.user.id || req.user.sub;
    return this.userService.agentSelfTopup(userId, body.amount);
  }

  @Patch('profile-photo')
  @UseInterceptors(FileInterceptor('photo', { storage: memoryStorage() }))
  async updateProfilePhoto(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const userId = req.user.id || req.user.sub;
    const photoUrl = await this.imagekitService.uploadFile(file, 'profiles');
    return this.userService.updateProfilePhoto(userId, photoUrl);
  }
}
