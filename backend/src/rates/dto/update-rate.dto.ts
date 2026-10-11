import { IsIn, IsNumber, Max, Min } from 'class-validator';

// Lis fèmen klè yo deja itilize an pwodiksyon (frontend limite deja `key`
// a yon <select> fèmen — men backend pa t janm verifye l). Yon to chanj
// (Decimal 18,4 nan Prisma) pa menm bagay ak yon montan lajan HTG — li ka
// gen jiska 4 chif apre pwen, se pou sa li pa itilize IsMoneyAmount.
export const RATE_KEYS = ['USD_HTG', 'EUR_HTG', 'USDT_HTG', 'CARD_RATE'];

// RatesService.updateRate deja aplike menm bòn sa yo (1-1000) kòm dezyèm
// kouch — DTO a se premye filtraj la, anvan menm rive nan service la.
export const RATE_VALUE_MIN = 1;
export const RATE_VALUE_MAX = 1000;

export class UpdateRateDto {
  @IsIn(RATE_KEYS)
  key: string;

  @IsNumber()
  @Min(RATE_VALUE_MIN)
  @Max(RATE_VALUE_MAX)
  value: number;
}
