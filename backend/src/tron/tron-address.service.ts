import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { deriveTronAddress } from './hd-wallet.util';

@Injectable()
export class TronAddressService {
  private readonly logger = new Logger(TronAddressService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Returns the user's permanent TRC20 deposit address, creating it on
  // first request. The address is derived from `derivationIndex` (assigned
  // atomically by the DB's autoincrement sequence) — no private key is
  // ever stored.
  async getOrCreateDepositAddress(userId: string) {
    const existing = await this.prisma.depositAddress.findUnique({ where: { userId } });
    if (existing) return existing;

    try {
      const reserved = await this.prisma.depositAddress.create({
        data: { userId, address: `pending-${userId}` },
      });

      const address = deriveTronAddress(reserved.derivationIndex);

      return await this.prisma.depositAddress.update({
        where: { id: reserved.id },
        data: { address },
      });
    } catch (err: any) {
      if (err.code === 'P2002') {
        const raced = await this.prisma.depositAddress.findUnique({ where: { userId } });
        if (raced) return raced;
      }
      this.logger.error(`getOrCreateDepositAddress echwe pou userId=${userId}: ${err.message}`);
      throw err;
    }
  }
}
