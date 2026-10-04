import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';

// Kriyè: KYC APPROVED, ZERO VirtualCard STROWALLET_NFC (kèlkeswa status —
// menm TERMINATED vle di yon cardkyc te deja soumèt pou kont sa a), ZERO
// CardCreationFailure (menm rezon — yon tantativ anvan ta deja kreye yon
// demand sou dashboard ziiropay, ki ta fo-rezilta pou tès sa a).
async function main() {
  const prisma = new PrismaClient();
  try {
    const candidates = await prisma.user.findMany({
      where: {
        kyc: { status: 'APPROVED' },
        virtualCards: { none: { provider: 'STROWALLET_NFC' } },
        cardCreationFailures: { none: {} },
      },
      include: { kyc: true, wallet: true },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });
    console.log(`Total jwenn: ${candidates.length}\n`);
    for (const u of candidates) {
      console.log(JSON.stringify({
        id: u.id,
        email: u.email,
        name: u.name,
        kycStatus: u.kyc?.status,
        hasIdImage: !!u.kyc?.idImage,
        hasPhone: !!(u.kyc?.phoneNumber || u.phone),
        country: u.kyc?.country,
        createdAt: u.createdAt,
      }, null, 2));
    }
  } finally {
    await prisma.$disconnect();
  }
}
main();
