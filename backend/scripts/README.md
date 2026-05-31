# OZAMAPAY Scripts

Run all commands from the `backend/` directory.

## Backup

```bash
npm run backup
```

Creates a timestamped SQL dump in `./backups/`.
File format: `ozamapay_backup_YYYYMMDD_HHMMSS.sql`

Requires `pg_dump` to be installed locally and `DATABASE_URL` set in `.env`.

## Restore

```bash
npm run restore backups/ozamapay_backup_YYYYMMDD_HHMMSS.sql
```

Restores the database from a backup file. Prompts for confirmation before overwriting data.

Requires `psql` to be installed locally.

## Financial Audit

```bash
npm run audit:finance
```

Queries the live database and prints a breakdown of all wallet balances:

| Category | Description |
|---|---|
| Total User Wallets | Sum of all USER-role wallet balances |
| Total Agent Wallets | Sum of all AgentWallet balances |
| Master Wallet | OZAMAPAY treasury balance |
| GRAND TOTAL | Combined sum across all wallets |

Use this to verify that no funds were created or lost by a bug.
