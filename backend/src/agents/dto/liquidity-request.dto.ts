import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IsMoneyAmount } from '../../common/validation/money-amount.decorator';

export const LIQUIDITY_METHODS = ['MONCASH', 'ZELLE', 'CASH', 'BANK'];

// Demand likidite se yon reyapwovizyonman an gwo pou ajan an (pa yon
// operasyon kliyan inik) — admin toujou revize l manyèlman anvan lajan vrè
// deplase, men nou bloke valè absurd/negatif anvan yo rive nan koute admin lan.
export const AGENT_LIQUIDITY_REQUEST_MAX_HTG = 500_000;

export class LiquidityRequestDto {
  @IsMoneyAmount(AGENT_LIQUIDITY_REQUEST_MAX_HTG)
  amount: number;

  @IsString()
  @IsIn(LIQUIDITY_METHODS)
  method: 'MONCASH' | 'ZELLE' | 'CASH' | 'BANK';

  @IsString()
  @IsNotEmpty()
  accountInfo: string;
}

export class ApplyAgentDto {
  @IsOptional()
  @IsString()
  businessName?: string;
}
