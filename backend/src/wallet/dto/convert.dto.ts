import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { IsMoneyAmount } from '../../common/validation/money-amount.decorator';

export const CONVERT_CURRENCIES = ['HTG', 'USD', 'EUR'];

// Gad-fou sanite (pa yon règ biznis strik) — menm filozofi ak
// WALLET_TRANSFER_MAX_HTG : anpeche yon valè absurd/overflow san kontrenn
// yon konvèsyon legitim. Aplike sou valè EQUIVALENT an HTG, kèlkeswa
// devise sous/destinasyon an (RatesService.toHtgEquivalent).
export const CONVERT_MAX_HTG_EQUIVALENT = 500_000;

export class ConvertQuoteDto {
  @IsString()
  @IsIn(CONVERT_CURRENCIES)
  from: string;

  @IsString()
  @IsIn(CONVERT_CURRENCIES)
  to: string;

  // Plafon reyèl aplike apre konvèsyon an HTG (CONVERT_MAX_HTG_EQUIVALENT) —
  // 999_999_999 isit la se jis yon bòn DTO pou rejte chif absurdman gwo anvan
  // menm rive nan lojik la.
  @IsMoneyAmount(999_999_999)
  amount: number;
}

export class ConvertExecuteDto {
  @IsString()
  @IsNotEmpty()
  quoteId: string;
}
