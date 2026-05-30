import {
  IsEmail,
  IsNumber,
  IsString,
  Length,
} from 'class-validator';

export class TransferDto {
  @IsEmail()
  recipientEmail: string;

  @IsNumber()
  amount: number;

  @IsString()
  @Length(4, 4)
  pin: string;
}