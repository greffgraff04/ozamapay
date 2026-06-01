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
    const email = profile.emails[0].value;
    const googleId = profile.id;
    const name = `${profile.name.givenName} ${profile.name.familyName}`.trim();

    let user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await this.prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: { email, name, password: '', googleId },
        });
        await tx.wallet.create({ data: { userId: newUser.id, balance: 0 } });
        return newUser;
      });
    } else if (!user.googleId) {
      user = await this.prisma.user.update({ where: { email }, data: { googleId } });
    }

    return user;
  }
}
