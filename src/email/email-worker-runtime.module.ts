import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { DatabaseModule } from '../database/database.module';
import { PrismaService } from '../database/prisma.service';
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

function createWorker(
  prisma: PrismaService,
  modules: ModuleRef,
  config: ConfigService,
): EmailWorkerService {
  const settings = readEmailWorkerConfig(config, 'worker');
  const cleanup = new EmailJobCleanupService(prisma);
  const processor = new EmailJobProcessorService(
    {
      loader: new EmailJobLoaderService(prisma),
      reader: modules.get(EmailJobReaderService, { strict: false }),
      sender: modules.get(EmailSender, { strict: false }),
      outcomes: new EmailJobOutcomeService(prisma),
      cleanup,
    },
    settings,
  );
  return new EmailWorkerService(
    { claims: new EmailJobClaimService(prisma), processor, cleanup },
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
      provide: EmailWorkerService,
      inject: [PrismaService, ModuleRef, ConfigService],
      useFactory: createWorker,
    },
  ],
  exports: [EmailWorkerService],
})
export class EmailWorkerRuntimeModule {}
