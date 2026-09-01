/**
 * _check-olivier-bsicards-eur-live-balance.ts
 * Lekti sèlman, PA gen frè — rele mastercard-euro/get-card (konfime nan
 * dokimantasyon: retounen masked PAN, status, AK balans) pou konpare vrè
 * balans BSICards la ak VirtualCard.balance BDD nou apre backfill €3 la.
 */
import * as dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const BASE_URL = process.env.BSICARDS_BASE_URL ?? 'https://cards.bsigroup.tech/api/';
const PUBLIC_KEY = process.env.BSICARDS_PUBLIC_KEY ?? '';
const SECRET_KEY = process.env.BSICARDS_SECRET_KEY ?? '';
const CARD_ID = '6a962a96ed36d19c602cbe04';
const CUSTOMER_EMAIL = 'oliviergreffin20@gmail.com';

async function main() {
  const prisma = new PrismaClient();
  try {
    const card = await prisma.virtualCard.findUnique({ where: { cardId: CARD_ID } });
    console.log('── BDD OZAMAPAY ─────────────────────────────────────────────');
    console.log(`  VirtualCard.balance: €${Number(card?.balance).toFixed(2)}`);
    console.log(`  updatedAt: ${card?.updatedAt.toISOString()}`);

    console.log('\n── Apèl li-sèlman POST mastercard-euro/get-card ────────────');
    const { data } = await axios.post(
      `${BASE_URL}mastercard-euro/get-card`,
      { useremail: CUSTOMER_EMAIL, cardid: CARD_ID },
      { headers: { publickey: PUBLIC_KEY, secretkey: SECRET_KEY } },
    );
    console.log(JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.log('=== ECHÈK ===');
    console.log('Mesaj:', err?.message);
    if (err?.response?.data) console.log('Detay HTTP:', JSON.stringify(err.response.data, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
