import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsISO8601,
} from 'class-validator';

export class CreateKycDto {
  @IsOptional()
  @IsString()
  agentId?: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsISO8601()
  @IsNotEmpty()
  dateOfBirth: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  idType: string;

  @IsString()
  @IsNotEmpty()
  idNumber: string;

  @IsString()
  @IsNotEmpty()
  idImage: string;

  @IsString()
  @IsNotEmpty()
  userPhoto: string;

  @IsString()
  @IsNotEmpty()
  line1: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsString()
  @IsNotEmpty()
  zipCode: string;

  @IsString()
  @IsNotEmpty()
  country: string;
}

// 4 oct 2026 — PATCH /kyc/address: kont KYC APPROVED yo pa ka re-soumèt
// (KycService.submitKyc jete yon erè), men gen bezwen korije sèlman chan
// adrès yo (egzanp line1 twò kout, wè StrowalletService.isAddressTooShort()).
// Sèlman line1 obligatwa — rès yo opsyonèl pou pèmèt yon ti korije san
// egzije tout chan adrès yo ankò.
export class UpdateAddressDto {
  @IsString()
  @IsNotEmpty()
  line1: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  zipCode?: string;

  @IsOptional()
  @IsString()
  country?: string;
}