import { IsIn, IsString } from 'class-validator';
import { IsMoneyAmount } from '../../common/validation/money-amount.decorator';

// Sèl 2 opsyon aktyèlman ofri nan webapp (app/dashboard/page.tsx) — 'WISE'
// te retire deja kòte service la. Lis fèmen sa a ranplase ansyen kontwòl
// "serviceType === 'WISE'" ki te sèlman yon blocklist, pa yon vrè whitelist.
export const FINANCE_SERVICE_TYPES = ['NATCASH', 'USDT'];

// Okenn plafon pa t egziste pou demand finans — "amount" pa t janm valide
// (gap kritik idantifye nan odit la). Admin revize chak demand manyèlman
// (status PENDING), men nou bloke valè absurd anvan yo rive nan koute a.
export const FINANCE_REQUEST_MAX_HTG = 50_000;

export class FinanceRequestDto {
  @IsString()
  @IsIn(FINANCE_SERVICE_TYPES)
  serviceType: string;

  @IsMoneyAmount(FINANCE_REQUEST_MAX_HTG)
  amount: number;

  @IsString()
  details: string;
}
