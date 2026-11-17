import { PrismaService } from '../database/prisma.service';

export interface ClaimEmailJobsOptions {
  batchSize: number;
  leaseDurationMs: number;
}

export interface ClaimedEmailJob {
  id: string;
  leaseId: string;
}

export class EmailJobClaimService {
  constructor(private readonly prisma: PrismaService) {}

  async claim(options: ClaimEmailJobsOptions): Promise<ClaimedEmailJob[]> {
    if (
      !Number.isSafeInteger(options.batchSize) ||
      options.batchSize < 1 ||
      !Number.isSafeInteger(options.leaseDurationMs) ||
      options.leaseDurationMs < 1
    ) {
      throw new Error('Invalid email job claim settings.');
    }

    return this.prisma.$queryRaw<ClaimedEmailJob[]>`
      WITH candidates AS (
        SELECT id FROM email_jobs
        WHERE expires_at > NOW()
          AND ((status = 'PENDING' AND available_at <= NOW())
            OR (status = 'PROCESSING' AND lease_expires_at <= NOW()))
        ORDER BY available_at, created_at, id
        LIMIT ${options.batchSize}
        FOR UPDATE SKIP LOCKED
      )
      UPDATE email_jobs AS job
      SET status = 'PROCESSING', lease_id = gen_random_uuid(),
          lease_expires_at = NOW() + ${options.leaseDurationMs} * INTERVAL '1 millisecond',
          attempts = job.attempts + 1, updated_at = NOW()
      FROM candidates
      WHERE job.id = candidates.id
      RETURNING job.id, job.lease_id AS "leaseId"
    `;
  }
}
