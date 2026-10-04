/**
 * check-ziiropay-usd-float-balance.ts
 *
 * Lekti sèlman — GET https://ziiropay.com/api/wallet/balance/USD/ (dokiman
 * readme.io: strowallet.readme.io/reference/ziiropay-balance) pou konfime
 * balans float USD platfòm nan (pa yon wallet kliyan), apre
 * fund-withdraw-nfccard rejte ak "Insufficient USD balance" pandan yon tès
 * webhook (4 oct 2026).
 *
 * Kòmand:
 *   npx ts-node --transpile-only --compiler-options '{"module":"CommonJS","moduleResolution":"node","resolvePackageJsonExports":false}' scripts/one-off/check-ziiropay-usd-float-balance.ts
 */

import * as dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';

async function main() {
  const publicKey = process.env.ZIIROPAY_PUBLIC_KEY;
  if (!publicKey) {
    console.error('✗ ZIIROPAY_PUBLIC_KEY pa konfigire — ARÈTE.');
    process.exitCode = 1;
    return;
  }
  try {
    const { data } = await axios.get('https://ziiropay.com/api/wallet/balance/USD/', {
      params: { public_key: publicKey },
      timeout: 15000,
    });
    console.log('[ziiropay USD float balance]');
    console.log(JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error('ECHWE:', JSON.stringify(err?.response?.data ?? err?.message));
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
