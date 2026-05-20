import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Param,
} from '@nestjs/common';
import { KycService } from './kyc.service';
import { CreateKycDto } from './dto/kyc.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('kyc')
@UseGuards(JwtAuthGuard)
export class KycController {
  constructor(private kycService: KycService) {}

  @Post('submit')
  submit(@Request() req: any, @Body() dto: CreateKycDto) {
    return this.kycService.submitKyc(req.user.id, dto);
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