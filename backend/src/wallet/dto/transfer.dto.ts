import { IsEmail, IsString, Matches } from 'class-validator';
import { IsMoneyAmount } from '../../common/validation/money-amount.decorator';

// Pa gen plafon metye egziste pou transfer wallet-a-wallet (contrèman ak
// topup/withdraw ki gen bòn pwòp yo deja nan WalletService). 500 000 HTG se
// yon gad-fou sanite kont erè/overflow, pa yon règ biznis strik — anpeche
// yon valè absurd (yon chif anplis pa aksidan) san kontrenn yon transfè
// legitim ant itilizatè yo.
export const WALLET_TRANSFER_MAX_HTG = 500_000;

export class TransferDto {
  @IsEmail()
  recipientEmail: string;

  @IsMoneyAmount(WALLET_TRANSFER_MAX_HTG)
  amount: number;

  // PIN transaksyonèl la 4 a 6 chif (menm règ ak UserService.updateTransactionPin).
  @IsString()
  @Matches(/^\d{4,6}$/, { message: 'pin dwe 4 a 6 chif' })
  pin: string;
}