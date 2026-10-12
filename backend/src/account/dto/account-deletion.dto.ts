import { IsOptional, IsString, Matches } from 'class-validator';

// Re-otantifikasyon : mo pas OSWA kòd OTP (purpose=delete_account, deja
// voye pa POST /auth/otp/send) — youn de 2 obligatwa, verifye nan
// AccountDeletionService, pa nan DTO a (validasyon kwaze).
export class RequestAccountDeletionDto {
  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'otpCode dwe 6 chif' })
  otpCode?: string;
}
