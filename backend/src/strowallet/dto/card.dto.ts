import { IsIn, IsOptional, IsString } from 'class-validator';
import { IsMoneyAmount } from '../../common/validation/money-amount.decorator';

export const CARD_PROVIDERS = ['STROWALLET_NFC', 'BSICARDS_MASTERCARD_EUR'];

// StrowalletService.createAndFundCard aplike deja $3–$500 — plafon DTO a se
// jis bòn maksimòm lan, premye filtraj anvan menm rive nan service la.
export const CARD_AMOUNT_USD_MAX = 500;

export class CreateCardDto {
  @IsOptional()
  @IsIn(CARD_PROVIDERS)
  provider?: string;

  @IsOptional()
  @IsMoneyAmount(CARD_AMOUNT_USD_MAX)
  amount_usd?: number;
}

export class FundCardDto {
  @IsMoneyAmount(CARD_AMOUNT_USD_MAX)
  amount_usd: number;

  @IsOptional()
  @IsString()
  cardId?: string;
}

export class CardIdDto {
  @IsOptional()
  @IsString()
  cardId?: string;
}
