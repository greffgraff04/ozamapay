import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { UserService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ImageKitService } from '../imagekit/imagekit.service';
import { AgentSelfTopupDto, ChangePinDto, UpdateProfileDto } from './dto/user-money.dto';

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly imagekitService: ImageKitService,
  ) {}

  @Post('change-pin')
  @HttpCode(HttpStatus.OK)
  async changePin(@Req() req: any, @Body() body: ChangePinDto) {
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
  async agentTopup(@Req() req: any, @Body() body: AgentSelfTopupDto) {
    const userId = req.user.id || req.user.sub;
    return this.userService.agentSelfTopup(userId, body.amount);
  }

  // Lo L6 — "X-Device-Id" prezan = app mobil, chanjman telefòn mande OTP
  // (202 {requiresOtp, challengeToken}, pa gen modifikasyon an baz toujou).
  // San header a (webapp) = ansyen konpòtman, chanjman aplike dirèkteman,
  // webapp poko adapte pou flux OTP a — TOUFÈ: webapp ap bezwen adapte pita.
  @Patch('profile')
  async updateProfile(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
    @Body() body: UpdateProfileDto,
  ) {
    const userId = req.user.id || req.user.sub;
    const isMobileDevice = !!req.headers['x-device-id'];
    const result = await this.userService.updateProfile(userId, body, isMobileDevice);
    if ((result as any).requiresOtp) {
      res.status(HttpStatus.ACCEPTED);
    }
    return result;
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
