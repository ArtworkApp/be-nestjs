#!/usr/bin/env bash
set -euo pipefail

# Reusable local startup for environments without Docker.
# - Ensures required env vars are present
# - Starts Nest in watch mode

export NODE_ENV="${NODE_ENV:-development}"
export PORT="${PORT:-3000}"
export API_PREFIX="${API_PREFIX:-api/v1}"

export MONGO_URI="${MONGO_URI:-mongodb://localhost:27017/artwork_marketplace}"

export REDIS_HOST="${REDIS_HOST:-localhost}"
export REDIS_PORT="${REDIS_PORT:-6379}"

export JWT_SECRET="${JWT_SECRET:-dev-jwt-secret}"
export JWT_EXPIRES_IN="${JWT_EXPIRES_IN:-7d}"

export STRIPE_SECRET_KEY="${STRIPE_SECRET_KEY:-sk_test_demo}"
export STRIPE_WEBHOOK_SECRET="${STRIPE_WEBHOOK_SECRET:-whsec_demo}"
export SENDGRID_API_KEY="${SENDGRID_API_KEY:-SG.demo}"
export FROM_EMAIL="${FROM_EMAIL:-demo@example.com}"

echo "Starting Artwork Marketplace API local dev mode"

echo "Installing dependencies if needed..."
if [[ ! -d node_modules ]]; then
  npm install --legacy-peer-deps
fi

echo "Starting NestJS API on http://localhost:${PORT}/${API_PREFIX}"
exec npm run start:dev
