import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';
import { IsMoneyAmount } from '../../common/validation/money-amount.decorator';

// Plafon pou chak operasyon ajan — HTG. Montan topup/retrè kliyan an pwatik
// toujou lwen anba sa a (kraze lajan kach nan men yon ajan), chif sa a se yon
// gad-fou kont erè/abi, pa yon limit operasyonèl nòmal. Sous verite inik —
// AgentsService.assertValidAgentAmount reyouzi menm valè sa yo kòm dezyèm
// kouch defans, kèlkeswa mod ValidationPipe a (log/enforce).
export const AGENT_TOPUP_MAX_HTG = 200_000;
export const AGENT_WITHDRAW_COMMISSION_MAX_HTG = 200_000;

export class AgentTopupDto {
  @IsEmail()
  email: string;

  @IsMoneyAmount(AGENT_TOPUP_MAX_HTG)
  amount: number;
}

export class AgentWithdrawDto {
  @IsEmail()
  email: string;

  // Menm règ PIN ak UserService.updateTransactionPin (4-6 chif).
  @IsString()
  @Matches(/^\d{4,6}$/, { message: 'userPin dwe 4 a 6 chif' })
  userPin: string;

  @IsMoneyAmount(AGENT_WITHDRAW_COMMISSION_MAX_HTG)
  amount: number;
}

export class WithdrawCommissionDto {
  @IsMoneyAmount(AGENT_WITHDRAW_COMMISSION_MAX_HTG)
  amount: number;
}
