import { IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { IsMoneyAmount } from '../../common/validation/money-amount.decorator';
import { BUSINESS_TIERS } from '../../business/business.service';

// Admin-only (CooGuard) — moun ki gen aksè deja fyab, men odit la idantifye
// AdminService.adminTopup/adminTopupAgent pa gen gad "NaN" eksplisit ni
// plafon. Chif sa a se yon gad-fou sanite jeneral, pa yon limit metye strik.
export const ADMIN_TOPUP_MAX_HTG = 1_000_000;

export class AdminTopupDto {
  @IsMoneyAmount(ADMIN_TOPUP_MAX_HTG)
  amount: number;
}

export const AGENT_PACKAGE_TYPES = ['STANDARD_AGENT', 'VIP_AGENCE', 'MASTER_NODE'];

export class UpdateAgentPackageDto {
  @IsOptional()
  @IsIn(AGENT_PACKAGE_TYPES)
  packageType?: string;

  // commissionRate Prisma : Decimal(5,2) → 0-100 (pousantaj).
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  customCommission?: number;

  // dailyLimit Prisma : Decimal(18,2) HTG, pa gen plafon metye egziste.
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5_000_000)
  maxLimit?: number;
}

export const FINANCE_REQUEST_STATUSES = ['COMPLETED', 'REJECTED'];

export class ProcessFinanceRequestDto {
  @IsIn(FINANCE_REQUEST_STATUSES)
  status: 'COMPLETED' | 'REJECTED';

  @IsOptional()
  @IsString()
  adminNote?: string;
}

export class ProcessTransactionDto {
  @IsIn(FINANCE_REQUEST_STATUSES)
  status: 'COMPLETED' | 'REJECTED';

  @IsOptional()
  @IsString()
  adminId?: string;
}

export class UpdateBusinessTierDto {
  @IsIn(BUSINESS_TIERS)
  tier: 'STARTER' | 'PRO' | 'ENTERPRISE';
}
