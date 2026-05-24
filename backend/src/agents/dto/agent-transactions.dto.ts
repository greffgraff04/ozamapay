import {
  IsNotEmpty,
  IsNumber,
  IsPositive,
} from 'class-validator';

export class AgentTopupDto {
  @IsNotEmpty()
  userId: string;

  @IsNumber()
  @IsPositive()
  amount: number;
}

export class AgentWithdrawDto {
  @IsNotEmpty()
  userId: string;

  @IsNumber()
  @IsPositive()
  amount: number;
}