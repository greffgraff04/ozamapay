import {
  IsString,
  IsNumberString,
  Length,
  IsEmail,
} from 'class-validator';

export class AgentWithdrawDto {
  @IsEmail()
  email: string;

  @IsNumberString()
  amount: string;

  @IsString()
  @Length(4, 6)
  userPin: string;
}