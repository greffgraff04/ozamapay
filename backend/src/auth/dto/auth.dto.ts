// src/auth/dto/auth.dto.ts

import {
  IsEmail,
  IsNotEmpty,
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