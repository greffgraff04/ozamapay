import { expectInvalid, expectValid } from '../../common/validation/test-helpers';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  Enable2FADto,
  Complete2FADto,
  RefreshTokenDto,
  SendOtpDto,
  VerifyOtpDto,
  DeviceNotMeDto,
} from './auth.dto';

describe('RegisterDto (/auth/register)', () => {
  it('aksepte yon payload valid', () =>
    expectValid(RegisterDto, { email: 'a@b.com', name: 'Jan', password: 'secret1' }));

  it('rejte yon modpas twò kout', () =>
    expectInvalid(RegisterDto, { email: 'a@b.com', name: 'Jan', password: 'abc' }));
});

describe('LoginDto (/auth/login)', () => {
  it('aksepte yon payload valid', () =>
    expectValid(LoginDto, { email: 'a@b.com', password: 'secret1' }));

  it('rejte yon imel envalid', () => expectInvalid(LoginDto, { email: 'pa-imel', password: 'secret1' }));
});

describe('ForgotPasswordDto (/auth/forgot-password)', () => {
  it('aksepte yon payload valid', () => expectValid(ForgotPasswordDto, { email: 'a@b.com' }));

  it('rejte yon email undefined/non-string (ta fè yon 500 anvan — gap idantifye nan odit)', () =>
    expectInvalid(ForgotPasswordDto, { email: undefined }));
});

describe('ResetPasswordDto (/auth/reset-password)', () => {
  it('aksepte yon payload valid', () =>
    expectValid(ResetPasswordDto, { token: 'abc123', newPassword: 'secret1' }));

  it('rejte yon modpas twò kout', () =>
    expectInvalid(ResetPasswordDto, { token: 'abc123', newPassword: 'ab' }));
});

describe('Enable2FADto (/auth/2fa/enable)', () => {
  it('aksepte yon kòd TOTP valid (6 chif)', () => expectValid(Enable2FADto, { token: '123456' }));

  it('rejte yon kòd ki pa 6 chif', () => expectInvalid(Enable2FADto, { token: '12' }));
});

describe('Complete2FADto (/auth/2fa/complete)', () => {
  it('aksepte yon payload valid', () =>
    expectValid(Complete2FADto, { tempToken: 'jwt.token.here', totpCode: '654321' }));

  it('rejte yon totpCode non-nimerik', () =>
    expectInvalid(Complete2FADto, { tempToken: 'jwt.token.here', totpCode: 'abcdef' }));
});

describe('RefreshTokenDto (/auth/refresh — app mobil sèlman)', () => {
  it('aksepte yon payload valid', () => expectValid(RefreshTokenDto, { refreshToken: 'abc123' }));

  it('rejte yon refreshToken vid', () => expectInvalid(RefreshTokenDto, { refreshToken: '' }));
});

describe('SendOtpDto (/auth/otp/send)', () => {
  it('aksepte purpose=register san lòt chan (idantite soti nan Bearer)', () =>
    expectValid(SendOtpDto, { purpose: 'register' }));

  it('aksepte purpose=reset ak email', () => expectValid(SendOtpDto, { purpose: 'reset', email: 'a@b.com' }));

  it('rejte yon purpose ki pa nan lis fèmen an', () => expectInvalid(SendOtpDto, { purpose: 'autre' }));
});

describe('VerifyOtpDto (/auth/otp/verify)', () => {
  it('aksepte yon kòd 6 chif valid', () => expectValid(VerifyOtpDto, { purpose: 'register', code: '123456' }));

  it('rejte yon kòd ki pa 6 chif', () => expectInvalid(VerifyOtpDto, { purpose: 'register', code: '123' }));
});

describe('DeviceNotMeDto (/auth/device/not-me)', () => {
  it('aksepte yon challengeToken valid', () => expectValid(DeviceNotMeDto, { challengeToken: 'jwt.here' }));

  it('rejte yon challengeToken vid', () => expectInvalid(DeviceNotMeDto, { challengeToken: '' }));
});
