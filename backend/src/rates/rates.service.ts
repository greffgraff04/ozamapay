import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RatesService {
  constructor(private prisma: PrismaService) {}

  async getAllRates() {
    return this.prisma.rate.findMany();
  }

  async updateRate(key: string, value: number) {
    return this.prisma.rate.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
}