// src/auth/dto/auth.dto.ts

import {
  IsEmail,
  IsNotEmpty,
  Matches,
  MinLength,
  IsOptional,
  IsString,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  name: string;

  @MinLength(6)
  password: string;

  // 🔥 Agent referral code
  @IsOptional()
  @IsString()
  agentCode?: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;

  @IsOptional()
  @IsString()
  dailyCode?: string;
}

// `AuthController.forgotPassword` te fè `email.toLowerCase()` san verifye
// kalite valè a — yon `email` undefined/non-string ta fè sèvè a krache yon
// erè 500 olye yon 400 pwòp (gap idantifye nan odit la).
export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  // AuthService.resetPassword deja revalide longè 6 karaktè minimòm kòm
  // dezyèm kouch defans — DTO a se premye filtraj la.
  @IsString()
  @MinLength(6)
  newPassword: string;
}

export class Enable2FADto {
  // Kòd TOTP estanda : 6 chif.
  @IsString()
  @Matches(/^\d{6}$/, { message: 'token dwe 6 chif' })
  token: string;
}

export class Complete2FADto {
  @IsString()
  @IsNotEmpty()
  tempToken: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'totpCode dwe 6 chif' })
  totpCode: string;
}

// Sesyon app mobil (plan endpoints-app, lo L1) — `refreshToken` se valè brit
// la, jamè hash la; AuthService.refresh() fè sha256 anvan li konpare l ak
// Session.refreshTokenHash.
export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class RevokeSessionsDto {
  @IsOptional()
  includeCurrent?: boolean;
}