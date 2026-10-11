import { IsOptional, IsString } from 'class-validator';
import { IsMoneyAmount } from '../../common/validation/money-amount.decorator';

// PaymentsService.createMonCashPayment ak MonCashConnectService.createPaymentRequest
// pa t janm valide `amount` anvan yo rele founisè a (gap kritik idantifye
// nan odit la). MonCash se yon metòd domestik — menm plafon ak topup
// domestik nan wallet/topup (30 000 HTG).
export const MONCASH_TOPUP_MAX_HTG = 30_000;

export class MonCashTopupDto {
  @IsMoneyAmount(MONCASH_TOPUP_MAX_HTG)
  amount: number;

  @IsOptional()
  @IsString()
  agentId?: string;
}

export class MonCashConnectInitiateDto {
  @IsMoneyAmount(MONCASH_TOPUP_MAX_HTG)
  amount: number;
}
