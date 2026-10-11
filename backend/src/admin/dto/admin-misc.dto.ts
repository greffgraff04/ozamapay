import { IsBoolean, IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

export const KYC_REVIEW_STATUSES = ['APPROVED', 'REJECTED'];

export class ReviewKycDto {
  @IsIn(KYC_REVIEW_STATUSES)
  status: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  adminId?: string;
}

export class SuspendUserDto {
  @IsBoolean()
  isSuspended: boolean;
}

// AdminService.inviteEmployee valide deja `role` kont yon lis fèmen —
// dekoratè a ajoute yon 400 pwòp pi bonè nan pipeline la san chanje lojik
// service la.
export const EMPLOYEE_ROLES = ['SUPER_ADMIN', 'AGENT', 'SUPPORT', 'ADMIN'];

export class InviteEmployeeDto {
  @IsEmail()
  email: string;

  @IsIn(EMPLOYEE_ROLES)
  role: string;
}

export class RejectReasonDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class AdminNoteDto {
  @IsOptional()
  @IsString()
  adminNote?: string;
}
