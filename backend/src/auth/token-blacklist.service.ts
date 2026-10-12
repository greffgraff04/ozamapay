import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

// Pèsistan (table BlacklistedAccessToken) olye yon Map an memwa — te pèdi
// chak redeploy anvan. Menm entèfas piblik ak ansyen vèsyon an (add/has),
// JwtStrategy/AuthController pa chanje — sèlman estokaj la pase nan Prisma.
@Injectable()
export class TokenBlacklistService {
  constructor(private readonly prisma: PrismaService) {}

  async add(jti: string, exp: number): Promise<void> {
    await this.prisma.blacklistedAccessToken.upsert({
      where: { jti },
      create: { jti, expiresAt: new Date(exp * 1000) },
      update: { expiresAt: new Date(exp * 1000) },
    });
  }

  async has(jti: string): Promise<boolean> {
    const row = await this.prisma.blacklistedAccessToken.findUnique({ where: { jti } });
    return !!row;
  }

  // Chak 24h — netwaye tokens ki deja ekspire yo pou evite kwasans san fen
  @Cron('0 0 * * *')
  async cleanup(): Promise<void> {
    await this.prisma.blacklistedAccessToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }
}
