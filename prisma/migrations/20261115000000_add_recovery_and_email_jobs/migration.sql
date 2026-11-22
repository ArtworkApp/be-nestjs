-- Additive account-recovery and durable email-job schema.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE TYPE "EmailJobKind" AS ENUM ('WELCOME', 'PASSWORD_RESET', 'PASSWORD_CHANGED');
CREATE TYPE "EmailJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'EXPIRED');

ALTER TABLE "users" ADD COLUMN "session_version" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "invalidated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "email_jobs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "reset_token_id" UUID,
    "kind" "EmailJobKind" NOT NULL,
    "status" "EmailJobStatus" NOT NULL DEFAULT 'PENDING',
    "idempotency_key" TEXT NOT NULL,
    "encrypted_payload" BYTEA,
    "payload_key_id" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "lease_id" UUID,
    "lease_expires_at" TIMESTAMP(3),
    "last_error_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "email_jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");
CREATE INDEX "password_reset_tokens_user_id_expires_at_idx" ON "password_reset_tokens"("user_id", "expires_at");
CREATE UNIQUE INDEX "email_jobs_idempotency_key_key" ON "email_jobs"("idempotency_key");
CREATE INDEX "email_jobs_status_available_at_created_at_idx" ON "email_jobs"("status", "available_at", "created_at");
CREATE INDEX "email_jobs_status_lease_expires_at_idx" ON "email_jobs"("status", "lease_expires_at");
CREATE INDEX "email_jobs_user_id_idx" ON "email_jobs"("user_id");
CREATE INDEX "email_jobs_reset_token_id_idx" ON "email_jobs"("reset_token_id");

ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "email_jobs" ADD CONSTRAINT "email_jobs_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "email_jobs" ADD CONSTRAINT "email_jobs_reset_token_id_fkey"
    FOREIGN KEY ("reset_token_id") REFERENCES "password_reset_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;
