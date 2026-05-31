#!/bin/bash
echo "🔍 OZAMAPAY Financial Audit"
source .env
psql "$DATABASE_URL" << 'EOF'
SELECT
  'Total User Wallets' AS category,
  SUM(balance) AS total_htg
FROM "Wallet" w
JOIN "User" u ON u.id = w."userId"
WHERE u.role = 'USER'
UNION ALL
SELECT
  'Total Agent Wallets',
  SUM(balance)
FROM "AgentWallet"
UNION ALL
SELECT
  'Master Wallet (OZAMAPAY)',
  balance
FROM "Wallet" w
JOIN "User" u ON u.id = w."userId"
WHERE u.email = 'master@ozamapay.com'
UNION ALL
SELECT
  'GRAND TOTAL',
  (SELECT SUM(balance) FROM "Wallet") + (SELECT COALESCE(SUM(balance), 0) FROM "AgentWallet");
EOF
