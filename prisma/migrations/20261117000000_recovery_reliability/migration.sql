ALTER TABLE "users" ADD COLUMN "welcome_email_pending" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "recovery_rate_limits" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "reset_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "recovery_rate_limits_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "recovery_rate_limits_reset_at_idx" ON "recovery_rate_limits"("reset_at");
