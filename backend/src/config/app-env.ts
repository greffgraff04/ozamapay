// Single source of truth for "are we in staging". Absent or any value other
// than 'staging' (including 'production') must behave exactly like today.
export function isStaging(): boolean {
  return process.env.APP_ENV === 'staging';
}

// Staging must never be pointed at the prod Neon database — a staging
// deploy sharing prod data would defeat the entire point of this safety
// layer. Thrown, not process.exit()'d directly, so main.ts stays in charge
// of the exit path (and this stays unit-testable without forking a process).
// Deliberately doesn't log/include the DATABASE_URL value itself — only the
// fact that it matched — per the no-secrets-in-output rule.
export function assertStagingNotUsingProdDatabase(): void {
  if (!isStaging()) return;
  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl.includes('neondb')) {
    throw new Error(
      'APP_ENV=staging men DATABASE_URL sanble pwente sou baz done pwodiksyon (neondb) — refize demare.',
    );
  }
}

// TRON_NETWORK: additive — unset (or 'mainnet') keeps today's behavior
// (api.trongrid.io) exactly. Only used as the TRONGRID_BASE_URL *default*;
// an explicit TRONGRID_BASE_URL env var still always wins, unchanged.
export function defaultTrongridBaseUrlForNetwork(): string {
  const network = process.env.TRON_NETWORK || 'mainnet';
  return network === 'nile' || network === 'testnet'
    ? 'https://nile.trongrid.io'
    : 'https://api.trongrid.io';
}
