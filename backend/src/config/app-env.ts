import { ForbiddenException } from '@nestjs/common';

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

// The @Cron wrappers (scheduledSweepSafetyNet, scheduledReconciliation, ...)
// already no-op in staging, but the admin-triggered manual endpoints
// (POST /admin/sweep/run, GET /admin/reconciliation/run) call the
// underlying runSweep()/runReconciliation() directly and bypass that guard
// entirely. This is the backstop for those: refuse any manual TRON trigger
// in staging unless TRON_NETWORK is explicitly pointed at a testnet — a
// mainnet/absent TRON_NETWORK in staging would otherwise mean an admin
// "test" sweep moves real USDT.
// Purely informational, staging-only, never throws — lets whoever is
// watching boot logs see at a glance which provider secrets are missing,
// instead of discovering it later as an opaque error the first time a
// feature is exercised. TRON_MASTER_MNEMONIC/SWEEP_MASTER_MNEMONIC and the
// Reloadly/MonCash credentials are all read lazily by their respective
// services, so a missing one never crashes boot either way — this just
// makes that state visible up front.
export function logStagingProviderReadiness(): void {
  if (!isStaging()) return;
  const checks: Array<{ name: string; ok: boolean }> = [
    { name: 'TRON_MASTER_MNEMONIC (jenerasyon adrès depo)', ok: !!process.env.TRON_MASTER_MNEMONIC },
    { name: 'SWEEP_MASTER_MNEMONIC (treasury/sweep)', ok: !!process.env.SWEEP_MASTER_MNEMONIC },
    {
      name: 'Reloadly (RELOADLY_CLIENT_ID + RELOADLY_CLIENT_SECRET)',
      ok: !!process.env.RELOADLY_CLIENT_ID && !!process.env.RELOADLY_CLIENT_SECRET,
    },
    {
      name: 'MonCash natif (MONCASH_MODE=sandbox + credentials sandbox)',
      ok: process.env.MONCASH_MODE === 'sandbox' && !!process.env.MONCASH_CLIENT_ID && !!process.env.MONCASH_SECRET_KEY,
    },
  ];
  for (const check of checks) {
    if (check.ok) {
      console.log(`[staging] ${check.name}: konfigire.`);
    } else {
      console.warn(
        `[staging] ${check.name}: ABSAN — fonksyon konsène ap bay yon erè klè si yo rele l, pa gen krach demaraj.`,
      );
    }
  }
}

export function assertTronManualTriggerAllowedInStaging(): void {
  if (!isStaging()) return;
  const network = process.env.TRON_NETWORK;
  if (!network || network === 'mainnet') {
    throw new ForbiddenException(
      'Deklanchman manyèl TRON refize an staging — TRON_NETWORK dwe konfigire sou yon testnet ' +
      '(egz. "nile"), li pa ka absan oswa "mainnet".',
    );
  }
}
