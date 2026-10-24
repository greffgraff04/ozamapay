import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { IsMoneyAmount } from '../../common/validation/money-amount.decorator';

export const WITHDRAW_METHODS = ['MONCASH', 'NATCASH', 'BANK', 'ZELLE', 'CASHAPP', 'MERU', 'USDT'];

// WalletService.createWithdrawRequest aplike deja 50-10 000 HTG apre
// konvèsyon — plafon DTO a se menm valè a, jis pi bonè nan pipeline la.
export const WALLET_WITHDRAW_MAX_HTG = 10_000;

export class WithdrawRequestDto {
  @IsMoneyAmount(WALLET_WITHDRAW_MAX_HTG)
  amount: number;

  // Webapp voye "moncash"/"bank"/etc an miniskil (wè frontend/app/dashboard)
  // — @Transform aksepte DE KA yo (ValidationModePipe sèlman aplike
  // @Transform an mod "enforce"; an mod "log" kontwòlè a nòmalize li menm,
  // wè WalletController.createWithdrawRequest).
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsString()
  @IsIn(WITHDRAW_METHODS)
  method: string;

  @IsString()
  @IsNotEmpty()
  accountInfo: string;
}
