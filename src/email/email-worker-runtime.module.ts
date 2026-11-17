import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { PrismaService } from '../database/prisma.service';
import { RecoveryRateLimitMaintenance } from '../auth/recovery-rate-limit-maintenance';
import { WelcomeEmailService } from '../auth/welcome-email.service';
import { EmailJobService } from './email-job.service';
import { EmailJobClaimService } from './email-job-claim.service';
import { EmailJobCleanupService } from './email-job-cleanup.service';
import { EmailJobLoaderService } from './email-job-loader.service';
import { EmailJobOutcomeService } from './email-job-outcome.service';
import { EmailJobProcessorService } from './email-job-processor.service';
import { EmailJobReaderService } from './email-job-reader.service';
import { EmailJobsModule } from './email-jobs.module';
import { EmailModule } from './email.module';
import { EmailSender } from './email-sender';
import { readEmailWorkerConfig } from './email-worker-config';
import { EmailWorkerService } from './email-worker.service';

const WORKER_EMAIL_DEPENDENCIES = Symbol('WORKER_EMAIL_DEPENDENCIES');

interface WorkerEmailDependencies {
  reader: EmailJobReaderService;
  sender: EmailSender;
  jobs: EmailJobService;
}

function createWorker(
  prisma: PrismaService,
  email: WorkerEmailDependencies,
  config: ConfigService,
): EmailWorkerService {
  const settings = readEmailWorkerConfig(config, 'worker');
  const cleanup = new EmailJobCleanupService(prisma);
  const processor = new EmailJobProcessorService(
    {
      loader: new EmailJobLoaderService(prisma),
      reader: email.reader,
      sender: email.sender,
      outcomes: new EmailJobOutcomeService(prisma),
      cleanup,
    },
    settings,
  );
  return new EmailWorkerService(
    {
      claims: new EmailJobClaimService(prisma),
      processor,
      cleanup,
      welcomes: new WelcomeEmailService(prisma, email.jobs),
      rateLimits: new RecoveryRateLimitMaintenance(prisma),
    },
    {
      pollIntervalMs: settings.pollIntervalMs,
      batchSize: settings.batchSize,
      concurrency: settings.concurrency,
      leaseDurationMs: settings.leaseDurationMs,
    },
  );
}

@Module({
  imports: [ConfigModule, DatabaseModule, EmailModule, EmailJobsModule],
  providers: [
    {
      provide: WORKER_EMAIL_DEPENDENCIES,
      inject: [EmailJobReaderService, EmailSender, EmailJobService],
      useFactory: (
        reader: EmailJobReaderService,
        sender: EmailSender,
        jobs: EmailJobService,
      ): WorkerEmailDependencies => ({ reader, sender, jobs }),
    },
    {
      provide: EmailWorkerService,
      inject: [PrismaService, WORKER_EMAIL_DEPENDENCIES, ConfigService],
      useFactory: createWorker,
    },
  ],
  exports: [EmailWorkerService],
})
export class EmailWorkerRuntimeModule {}
