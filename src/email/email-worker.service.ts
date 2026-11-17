import { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  EmailJobClaimService,
  ClaimedEmailJob,
} from './email-job-claim.service';
import { EmailJobCleanupService } from './email-job-cleanup.service';
import { EmailJobProcessorService } from './email-job-processor.service';

interface WorkerDependencies {
  claims: Pick<EmailJobClaimService, 'claim'>;
  processor: Pick<EmailJobProcessorService, 'process'>;
  cleanup: Pick<EmailJobCleanupService, 'expireJobs'>;
}

interface WorkerSettings {
  pollIntervalMs: number;
  batchSize: number;
  concurrency: number;
  leaseDurationMs: number;
}

export class EmailWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailWorkerService.name);
  private timer: ReturnType<typeof setTimeout> | undefined;
  private active: Promise<void> | undefined;
  private stopping = false;

  constructor(
    private readonly dependencies: WorkerDependencies,
    private readonly settings: WorkerSettings,
  ) {
    if (
      Object.values(settings).some(
        (value) => !Number.isSafeInteger(value) || value < 1,
      )
    ) {
      throw new Error('Invalid email worker settings.');
    }
  }

  onModuleInit(): void {
    this.schedule(0);
  }

  async onModuleDestroy(): Promise<void> {
    this.stopping = true;
    if (this.timer) clearTimeout(this.timer);
    try {
      await this.active;
    } catch {
      // The polling loop reports failures without including sensitive details.
    }
  }

  async runOnce(): Promise<void> {
    if (this.stopping) return;
    if (this.active) return this.active;
    const task = this.runBatch();
    this.active = task;
    try {
      await task;
    } finally {
      this.active = undefined;
    }
  }

  private async runBatch(): Promise<void> {
    await this.dependencies.cleanup.expireJobs();
    if (this.stopping) return;
    const jobs = await this.dependencies.claims.claim({
      batchSize: this.settings.batchSize,
      leaseDurationMs: this.settings.leaseDurationMs,
    });
    await this.processJobs(jobs);
  }

  private async processJobs(jobs: ClaimedEmailJob[]): Promise<void> {
    for (
      let index = 0;
      index < jobs.length && !this.stopping;
      index += this.settings.concurrency
    ) {
      const results = await Promise.allSettled(
        jobs
          .slice(index, index + this.settings.concurrency)
          .map((job) => this.dependencies.processor.process(job)),
      );
      if (results.some((result) => result.status === 'rejected')) {
        throw new Error('Email job processing failed.');
      }
    }
  }

  private schedule(delay: number): void {
    this.timer = setTimeout(() => {
      void this.poll();
    }, delay);
  }

  private async poll(): Promise<void> {
    try {
      await this.runOnce();
    } catch {
      this.logger.error('Email worker polling failed.');
    }
    if (!this.stopping) this.schedule(this.settings.pollIntervalMs);
  }
}
