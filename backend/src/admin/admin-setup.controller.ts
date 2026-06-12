import { Controller, Get, Post, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin/setup')
export class AdminSetupController {
  constructor(private readonly adminService: AdminService) {}

  @Get(':token')
  validateToken(@Param('token') token: string) {
    return this.adminService.validateSetupToken(token);
  }

  @Post('complete')
  @HttpCode(HttpStatus.CREATED)
  completeSetup(
    @Body() body: {
      token: string;
      firstName: string;
      lastName: string;
      phone: string;
      password: string;
      dailyCode: string;
    },
  ) {
    const { token, dailyCode, ...personalInfo } = body;
    return this.adminService.acceptInvitation(token, personalInfo, dailyCode);
  }
}
