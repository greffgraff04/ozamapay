// src/auth/auth.controller.ts

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { AuthService, DeviceInfo } from './auth.service';
import {
  LoginDto,
  RegisterDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  Enable2FADto,
  Complete2FADto,
  RefreshTokenDto,
  RevokeSessionsDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

// App mobil sèlman — header "X-Device-Id" prezan vle di se app a k ap rele,
// webapp pa janm voye l, donk `deviceInfo` ap toujou `undefined` pou webapp
// e tout branch ki depann de li yo (AuthService.login/refresh) rete inatif.
function extractDeviceInfo(req: any): DeviceInfo | undefined {
  const deviceId = req.headers['x-device-id'] as string | undefined;
  if (!deviceId) return undefined;
  const ip = ((req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()) || req.ip;
  return {
    deviceId,
    deviceName: req.headers['x-device-name'] as string | undefined,
    platform: req.headers['x-device-platform'] as string | undefined,
    ipAddress: ip,
    userAgent: req.headers['user-agent'] as string | undefined,
  };
}

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
  login(@Body() dto: LoginDto, @Req() req: any) {
    const ip = ((req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()) || req.ip;
    const userAgent = req.headers['user-agent'] as string | undefined;
    return this.authService.login(dto, ip, userAgent, extractDeviceInfo(req));
  }

  // =========================
  // MOBILE SESSIONS (plan endpoints-app, lo L1) — webapp n'appelle jamais
  // ces routes, elles existent uniquement pour l'app (X-Device-Id).
  // =========================
  @Post('refresh')
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  refresh(@Body() dto: RefreshTokenDto, @Req() req: any) {
    return this.authService.refresh(dto.refreshToken, extractDeviceInfo(req));
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  listSessions(@Req() req: any) {
    const userId = req.user.id || req.user.sub;
    return this.authService.listSessions(userId, req.user.sid);
  }

  @Delete('sessions/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async revokeSession(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id || req.user.sub;
    await this.authService.revokeSession(userId, id);
    return { message: 'Sesyon revoke' };
  }

  @Post('sessions/revoke-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async revokeAllSessions(@Req() req: any, @Body() dto: RevokeSessionsDto) {
    const userId = req.user.id || req.user.sub;
    await this.authService.revokeAllSessions(userId, req.user.sid, dto.includeCurrent);
    return { message: 'Tout sesyon yo revoke' };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: any) {
    const { jti, exp } = req.user;
    if (jti && exp) await this.authService.invalidateToken(jti, exp);
    return { message: 'Dekonekte avèk siksè' };
  }

  @Post('admin/logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async adminLogout(@Req() req: any) {
    const { jti, exp } = req.user;
    if (jti && exp) await this.authService.invalidateToken(jti, exp);
    const userId = req.user?.id || req.user?.sub;
    return this.authService.logoutAdmin(userId);
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
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  // =========================
  // RESET PASSWORD
  // =========================
  @Post('reset-password')
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
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
    @Body() dto: Enable2FADto,
  ) {
    const userId = req.user.id || req.user.sub;
    return this.authService.enable2FA(userId, dto.token);
  }

  // =========================
  // 2FA COMPLETE (exchange tempToken + TOTP for full JWT)
  // =========================
  @Post('2fa/complete')
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  complete2FA(@Body() dto: Complete2FADto) {
    return this.authService.complete2FA(dto.tempToken, dto.totpCode);
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