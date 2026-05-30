import {
  IsString,
  IsNumber,
  IsPositive,
  IsNotEmpty,
} from 'class-validator';

export class AgentTopupDto {
  email: string;
  amount: number;
}

export class AgentWithdrawDto {
  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  userPin: string;

  @IsNumber()
  @IsPositive()
  amount: number;
}