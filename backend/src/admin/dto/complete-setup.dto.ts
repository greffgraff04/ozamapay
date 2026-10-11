import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

// Wout piblik (pa gen JwtAuthGuard) — AdminService.acceptInvitation pa t
// janm verifye fòs modpas la (gap idantifye nan odit la). @MinLength(6) se
// premye gad kont yon modpas vid/twò fèb pou yon kont admin.
export class CompleteSetupDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @MinLength(6)
  password: string;

  // AdminService.generate6CharCode() toujou pwodui 6 karaktè [A-Z0-9] —
  // AdminController.acceptInvitation deja fè .toUpperCase() kote li konpare,
  // men validasyon an pa dwe depann de sa, se pou sa [A-Za-z0-9] akseptab.
  @IsString()
  @Matches(/^[A-Za-z0-9]{6}$/, { message: 'dailyCode dwe 6 karaktè alfanimerik' })
  dailyCode: string;
}
