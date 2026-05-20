import { IsString, IsNotEmpty, IsOptional, IsISO8601 } from 'class-validator';

export class CreateKycDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsISO8601()
  @IsNotEmpty()
  dateOfBirth: string; // Fòma "YYYY-MM-DD"

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  idType: string; // PASSPORT, NATIONAL_ID, DRIVERS_LICENSE

  @IsString()
  @IsNotEmpty()
  idNumber: string;

  @IsString()
  @IsNotEmpty()
  idImage: string; // Lyen URL foto pyès la

  @IsString()
  @IsNotEmpty()
  userPhoto: string; // Lyen URL selfie a

  @IsString()
  @IsNotEmpty()
  line1: string; // Adrès kay la

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
  country: string; // Pa egzanp "HT"
}