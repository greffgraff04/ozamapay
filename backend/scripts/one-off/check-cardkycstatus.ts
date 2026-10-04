/**
 * check-cardkycstatus.ts
 *
 * Verifye cardkycstatus pou yon email bay, dirèkteman sou ziiropay.com.
 *
 * IMPORTAN: cardkycstatus PA fè pati ZIIROPAY_ALWAYS_ENDPOINTS/
 * ZIIROPAY_ENDPOINTS_READ/FULL nan StrowalletService — kidonk
 * resolveBaseUrl('cardkycstatus') ta retounen strowallet.com (kote
 * kliyan ki kreye pa cardkyc sou ziiropay.com pa egziste). Script sa a
 * rele ziiropay.com dirèkteman (menm jan ak lòt script diagnostik 2 oct
 * 2026 yo) pou evite fo "not found".
 *
 * Kòmand:
 *   npx ts-node --transpile-only --compiler-options '{"module":"CommonJS","moduleResolution":"node","resolvePackageJsonExports":false}' scripts/one-off/check-cardkycstatus.ts --email=xxx@gmail.com
 */

import * as dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';

const BASE_URL_ZIIROPAY = 'https://ziiropay.com/api/bitvcard';

function getArgValue(flag: string): string | null {
  const arg = process.argv.find((a) => a.startsWith(`${flag}=`));
  return arg ? arg.slice(flag.length + 1) : null;
}

async function main() {
  const email = getArgValue('--email');
  if (!email) {
    console.error('✗ Mande --email=<email>');
    process.exitCode = 1;
    return;
  }
  const publicKey = process.env.ZIIROPAY_PUBLIC_KEY;
  if (!publicKey) {
    console.error('✗ ZIIROPAY_PUBLIC_KEY pa konfigire nan anviwònman sa a — ARÈTE.');
    process.exitCode = 1;
    return;
  }
  try {
    const { data } = await axios.get(`${BASE_URL_ZIIROPAY}/cardkycstatus`, {
      params: { public_key: publicKey, email },
      timeout: 15000,
    });
    console.log(`[cardkycstatus] email=${email}`);
    console.log(JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error(`[cardkycstatus] ECHWE email=${email}:`, JSON.stringify(err?.response?.data ?? err?.message));
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
