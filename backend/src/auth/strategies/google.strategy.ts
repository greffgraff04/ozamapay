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
      console.log('Google validate - profile:', JSON.stringify({ id: profile.id, email: profile.emails?.[0]?.value, name: profile.displayName }));

      const email = profile.emails[0].value;
      const googleId = profile.id;

      let user = await this.prisma.user.findUnique({ where: { email } });
      console.log('Google validate - existing user:', user ? 'found' : 'not found');

      if (!user) {
        console.log('Google validate - creating new user');
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
        console.log('Google validate - linking googleId to existing user');
        user = await this.prisma.user.update({
          where: { email },
          data: { googleId },
        });
      }

      console.log('Google validate - success, returning user:', user.email);
      return user;
    } catch (error) {
      console.error('Google validate ERROR:', error.message, error.stack);
      throw error;
    }
  }
}
