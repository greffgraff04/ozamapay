import { IsIn, IsOptional, IsString } from 'class-validator';
import { IsMoneyAmount } from '../../common/validation/money-amount.decorator';

// Wout sa a aksepte multipart/form-data (upload resi) — `amount` rive kòm
// string. Pa gen @Type(() => Number) isit la: IsMoneyAmount fè `Number(value)`
// anndan l, donk li valide kòrèkteman kit valè a yon string oswa yon nonb —
// e kontwolè a deja fè `Number(body.amount)` anvan rele service la.
export const TOPUP_METHODS = ['MONCASH', 'NATCASH', 'BANK', 'ZELLE', 'CASHAPP', 'MERU', 'USDT'];

// Plafon DTO se bòn domestik la (30 000 HTG) — pi gwo pase bòn entènasyonal
// la ($1 000) — WalletService.createManualTopup aplike deja bòn presi ki
// depann de `method`; sa a se jis yon premye filtraj sanite.
export const WALLET_TOPUP_MAX_HTG = 30_000;

export class ManualTopupDto {
  @IsMoneyAmount(WALLET_TOPUP_MAX_HTG)
  amount: number;

  @IsString()
  @IsIn(TOPUP_METHODS)
  method: string;

  @IsOptional()
  @IsString()
  agentId?: string;
}
