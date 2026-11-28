// src/auth/dto/auth.dto.ts

// 13 nov 2026 — @Type() (class-transformer, AppleLoginDto.fullName) itilize
// Reflect.getMetadata — @nestjs/common/core chaje polyfill sa a kòm efè
// segondè nòmalman, men fichye sa a pa t janm depann de yon decorator ki
// bezwen l anvan (okenn lòt DTO isit la pa itilize @Type()). Enpòte l
// dirèkteman garanti fichye sa a travay kèlkeswa lòd enpòtasyon yon test
// izole chaje l.
import 'reflect-metadata';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  Matches,
  MinLength,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// Plan endpoints-app, lo L2 (+ lo L6 pou change_phone) — menm lis kle ak
// enum Prisma `OtpPurpose`, an miniskil paske se sa app/webapp yo voye
// (AuthController konvèti).
export const OTP_PURPOSES = ['register', 'new_device', 'reset', 'delete_account', 'change_phone'];

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

// `email` (purpose=reset) oswa `challengeToken` (purpose=new_device) selon
// `purpose` — purpose=register itilize Authorization: Bearer existan an,
// pa gen bezwen okenn chan anplis. Validasyon kwaze (yon chan obligatwa
// selon `purpose`) fèt nan OtpService, pa nan DTO a.
export class SendOtpDto {
  @IsIn(OTP_PURPOSES)
  purpose: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  challengeToken?: string;
}

export class VerifyOtpDto {
  @IsIn(OTP_PURPOSES)
  purpose: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'code dwe 6 chif' })
  code: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  challengeToken?: string;
}

export class DeviceNotMeDto {
  @IsString()
  @IsNotEmpty()
  challengeToken: string;
}

// =========================
// SIGN IN WITH APPLE / GOOGLE MOBIL (13 nov 2026, guideline 4.8) — app
// mobil sèlman (X-Device-Id obligatwa, wè AuthController). Apple bay
// non/email SÈLMAN nan premye login — `fullName`/`email` opsyonèl.
// =========================
export class AppleFullNameDto {
  @IsOptional()
  @IsString()
  givenName?: string;

  @IsOptional()
  @IsString()
  familyName?: string;
}

export class AppleLoginDto {
  @IsString()
  @IsNotEmpty()
  identityToken: string;

  @IsString()
  @IsNotEmpty()
  authorizationCode: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AppleFullNameDto)
  fullName?: AppleFullNameDto;

  @IsOptional()
  @IsEmail()
  email?: string;
}

export class GoogleMobileLoginDto {
  @IsString()
  @IsNotEmpty()
  idToken: string;
}