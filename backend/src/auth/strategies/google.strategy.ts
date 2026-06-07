import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private prisma: PrismaService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      callbackURL: (process.env.BACKEND_URL as string) + '/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any) {
    try {
      const email = profile.emails[0].value;
      const googleId = profile.id;

      let user = await this.prisma.user.findUnique({ where: { email } });

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            email,
            name: profile.displayName || email,
            password: '',
            googleId,
            wallet: { create: { balance: 0 } },
          },
        });
      } else if (!user.googleId) {
        user = await this.prisma.user.update({
          where: { email },
          data: { googleId },
        });
      }

      return user;
    } catch (error) {
      throw error;
    }
  }
}
