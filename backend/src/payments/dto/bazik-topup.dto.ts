import { IsMoneyAmount } from '../../common/validation/money-amount.decorator';

// Plafond réseau documenté par Bazik lui-même (docs/bazik-api.md §3) — 75 000
// GDES par transaction, HTTP 422 au-delà. Distinct de MONCASH_TOPUP_MAX_HTG
// (30 000, moncash-topup.dto.ts) qui reste le plafond MonCashConnect inchangé.
export const BAZIK_DEPOSIT_MAX_HTG = 75_000;

export class BazikInitiateDto {
  @IsMoneyAmount(BAZIK_DEPOSIT_MAX_HTG)
  amount: number;
}
