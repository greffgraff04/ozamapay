// src/auth/auth.controller.ts

import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';

import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  // =========================
  // REGISTER
  // =========================
  @Post('register')
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // =========================
  // LOGIN
  // =========================
  @Post('login')
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // =========================
  // PROFILE (GET ME)
  // =========================
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req: any) {
    const userId = req.user.id || req.user.sub;
    return this.authService.getMe(userId);
  }

  // =========================
  // FORGOT PASSWORD
  // =========================
  @Post('forgot-password')
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  // =========================
  // RESET PASSWORD
  // =========================
  @Post('reset-password')
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  resetPassword(
    @Body('token') token: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.authService.resetPassword(token, newPassword);
  }

  // =========================
  // 2FA SETUP (admin only, requires login)
  // =========================
  @Post('2fa/setup')
  @UseGuards(JwtAuthGuard)
  setup2FA(@Req() req: any) {
    const userId = req.user.id || req.user.sub;
    return this.authService.setup2FA(userId);
  }

  // =========================
  // 2FA ENABLE (confirm with TOTP code)
  // =========================
  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  enable2FA(
    @Req() req: any,
    @Body('token') token: string,
  ) {
    const userId = req.user.id || req.user.sub;
    return this.authService.enable2FA(userId, token);
  }

  // =========================
  // 2FA COMPLETE (exchange tempToken + TOTP for full JWT)
  // =========================
  @Post('2fa/complete')
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  complete2FA(
    @Body('tempToken') tempToken: string,
    @Body('totpCode') totpCode: string,
  ) {
    return this.authService.complete2FA(tempToken, totpCode);
  }

  // =========================
  // GOOGLE OAUTH
  // =========================
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: any, @Res() res: Response) {
    try {
      console.log('Google callback - user:', req.user?.email);
      if (!req.user) {
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=google_failed`);
      }
      const token = this.authService.signToken(req.user.id, req.user.email, req.user.role);
      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=google_failed`);
    }
  }
}