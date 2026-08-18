import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Airtime purchasing via Reloadly has been retired (product decision — Wise
// & Airtime removed). Only order-history lookups remain, so the 4 customers
// with past AirtimeOrder rows can still see their receipts; no new orders
// can be created since sendAirtime()/getOperators() and their routes are
// gone. Historical rows are untouched in the DB.
@Injectable()
export class AirtimeService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserOrders(userId: string) {
    return this.prisma.airtimeOrder.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}
