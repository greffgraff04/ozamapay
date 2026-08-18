import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const wiseCount = await prisma.serviceRequest.count({ where: { serviceType: 'WISE' } });
    const wisePending = await prisma.serviceRequest.count({ where: { serviceType: 'WISE', status: 'PENDING' } });
    const airtimeCount = await prisma.airtimeOrder.count();
    const airtimePending = await prisma.airtimeOrder.count({ where: { status: 'PENDING' } });
    const airtimeUsers = await prisma.airtimeOrder.findMany({ distinct: ['userId'], select: { userId: true } });

    console.log({
      wiseServiceRequests_total: wiseCount,
      wiseServiceRequests_pending: wisePending,
      airtimeOrders_total: airtimeCount,
      airtimeOrders_pending: airtimePending,
      airtimeOrders_distinctUsers: airtimeUsers.length,
    });
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
