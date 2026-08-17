#!/usr/bin/env bash
set -euo pipefail

# Local standalone startup (no Docker required).
# Requires PostgreSQL from development-environment Docker compose.
# All env vars can be overridden by exporting them before running this script.

export NODE_ENV="${NODE_ENV:-development}"
export PORT="${PORT:-3001}"
export API_PREFIX="${API_PREFIX:-api/v1}"

# ── Database ──────────────────────────────────────────────────────────────────
export DATABASE_URL="${DATABASE_URL:-postgresql://artwork_db_user:artwork_db_password@127.0.0.1:5433/artwork_db}"
export DATABASE_HOST="${DATABASE_HOST:-127.0.0.1}"
export DATABASE_PORT="${DATABASE_PORT:-5433}"
export DATABASE_USERNAME="${DATABASE_USERNAME:-artwork_db_user}"
export DATABASE_PASSWORD="${DATABASE_PASSWORD:-artwork_db_password}"
export DATABASE_NAME="${DATABASE_NAME:-artwork_db}"

# ── Auth ──────────────────────────────────────────────────────────────────────
export JWT_SECRET="${JWT_SECRET:-dev-jwt-secret-change-me}"
export JWT_EXPIRES_IN="${JWT_EXPIRES_IN:-7d}"

# ── Third-party placeholders (not needed for local DB work) ───────────────────
export STRIPE_SECRET_KEY="${STRIPE_SECRET_KEY:-sk_test_placeholder}"
export STRIPE_WEBHOOK_SECRET="${STRIPE_WEBHOOK_SECRET:-whsec_placeholder}"
export SENDGRID_API_KEY="${SENDGRID_API_KEY:-SG.placeholder}"
export FROM_EMAIL="${FROM_EMAIL:-dev@example.com}"
export AWS_REGION="${AWS_REGION:-us-east-1}"
export AWS_S3_BUCKET="${AWS_S3_BUCKET:-artwork-local-bucket}"

# ── File uploads ──────────────────────────────────────────────────────────────
export MAX_FILE_SIZE="${MAX_FILE_SIZE:-10485760}"
export ALLOWED_IMAGE_TYPES="${ALLOWED_IMAGE_TYPES:-image/jpeg,image/png,image/webp}"

echo "🚀 Starting Artwork Marketplace API in local standalone mode"
echo "   DB: ${DATABASE_URL}"

echo "📦 Installing dependencies if needed..."
if [[ ! -d node_modules ]]; then
  npm install --legacy-peer-deps
fi

echo "🔄 Generating Prisma client..."
npx prisma generate

echo "🗄️  Running database migrations..."
npx prisma migrate deploy

echo "🌱 Seeding database..."
npm run db:seed || echo "  (seed skipped — already seeded or DB not ready)"

echo "▶️  Starting NestJS on http://localhost:${PORT}/${API_PREFIX}"
exec npm run start:dev
