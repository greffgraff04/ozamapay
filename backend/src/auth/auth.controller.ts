// src/auth/auth.controller.ts

import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  Req, // <-- Enpòte Req isit la pou ranje erè compilation an
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { MailModule } from '../mail/mail.module';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  // =========================
  // REGISTER
  // =========================
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // =========================
  // LOGIN
  // =========================
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // =========================
  // PROFILE (GET ME)
  // =========================
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req: any) {
    // Rekipere id a depi nan token JWT a kòrèkteman
    const userId = req.user.id || req.user.sub;
    
    // Rele sèvis la pou l ale pran done fre ak tout Wallet + KYC nan database la
    return this.authService.getMe(userId);
  }
}