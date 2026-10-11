import { IsOptional, IsString, Matches } from 'class-validator';
import { IsMoneyAmount } from '../../common/validation/money-amount.decorator';

// UserService.agentSelfTopup pa gen plafon metye egziste — gad-fou sanite,
// menm echèl ak lòt operasyon ajan.
export const AGENT_SELF_TOPUP_MAX_HTG = 200_000;

export class AgentSelfTopupDto {
  @IsMoneyAmount(AGENT_SELF_TOPUP_MAX_HTG)
  amount: number;
}

export class ChangePinDto {
  // Menm règ ak UserService.updateTransactionPin (double validation : DTO +
  // service, pou DTO a rete korèk menm si yon lòt chemen rele service la
  // dirèkteman pita).
  @IsString()
  @Matches(/^\d{4,6}$/, { message: 'newPin dwe 4 a 6 chif' })
  newPin: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
