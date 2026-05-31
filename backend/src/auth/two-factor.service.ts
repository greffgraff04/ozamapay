import { Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';

@Injectable()
export class TwoFactorService {
  generateSecret(email: string): { secret: string; otpAuthUrl: string } {
    const secret = authenticator.generateSecret();
    const otpAuthUrl = authenticator.keyuri(email, 'OzamaPay', secret);
    return { secret, otpAuthUrl };
  }

  async generateQrCode(otpAuthUrl: string): Promise<string> {
    return QRCode.toDataURL(otpAuthUrl);
  }

  verifyToken(secret: string, token: string): boolean {
    try {
      return authenticator.verify({ token, secret });
    } catch {
      return false;
    }
  }
}
