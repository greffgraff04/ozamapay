import * as dotenv from 'dotenv';
dotenv.config();

const ORDER_ID = '63def7f5-0a9d-49e0-8cd1-a57d74f884dc'; // customIdentifier voye bay Reloadly

async function getReloadlyToken(): Promise<string> {
  const res = await fetch('https://auth.reloadly.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.RELOADLY_CLIENT_ID,
      client_secret: process.env.RELOADLY_CLIENT_SECRET,
      grant_type: 'client_credentials',
      audience: 'https://giftcards.reloadly.com',
    }),
  });
  if (!res.ok) throw new Error(`Reloadly auth failed: ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

async function main() {
  const token = await getReloadlyToken();
  console.log(`Chèche tranzaksyon Reloadly ak customIdentifier=${ORDER_ID}...\n`);

  const res = await fetch(`https://giftcards.reloadly.com/reports/transactions?customIdentifier=${ORDER_ID}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/com.reloadly.giftcards-v1+json' },
  });
  console.log(`GET /reports/transactions?customIdentifier=${ORDER_ID} → HTTP ${res.status}`);
  const body = await res.text();
  console.log(body);
}

main().catch((err) => {
  console.error('ERÈ:', err.message);
  process.exit(1);
});
