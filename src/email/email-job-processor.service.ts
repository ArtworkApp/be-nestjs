import { ClaimedEmailJob } from './email-job-claim.service';
import { EmailJobLoaderService } from './email-job-loader.service';
import { EmailJobReaderService } from './email-job-reader.service';
import { EmailJobOutcomeService } from './email-job-outcome.service';
import { EmailJobCleanupService } from './email-job-cleanup.service';
import { EmailSender } from './email-sender';

interface ProcessorDependencies {
  loader: Pick<EmailJobLoaderService, 'load'>;
  reader: Pick<EmailJobReaderService, 'read'>;
  sender: Pick<EmailSender, 'send'>;
  outcomes: Pick<EmailJobOutcomeService, 'markSent' | 'scheduleRetry'>;
  cleanup: Pick<EmailJobCleanupService, 'failExhausted'>;
}

interface ProcessorSettings {
  maxAttempts: number;
  retryDelayMs: number;
}

type ProcessResult =
  | 'sent'
  | 'unavailable'
  | 'retry_scheduled'
  | 'failed'
  | 'lease_lost'
  | 'not_scheduled';

export class EmailJobProcessorService {
  constructor(
    private readonly dependencies: ProcessorDependencies,
    private readonly settings: ProcessorSettings,
  ) {
    if (
      !Number.isSafeInteger(settings.maxAttempts) ||
      settings.maxAttempts < 1 ||
      !Number.isSafeInteger(settings.retryDelayMs) ||
      settings.retryDelayMs < 1
    ) {
      throw new Error('Invalid email processor settings.');
    }
  }

  async process(claim: ClaimedEmailJob): Promise<ProcessResult> {
    const job = await this.dependencies.loader.load(claim);
    if (!job) return 'unavailable';
    if (job.attempts > this.settings.maxAttempts) {
      return (await this.dependencies.cleanup.failExhausted(
        claim,
        this.settings.maxAttempts,
      ))
        ? 'failed'
        : 'lease_lost';
    }

    try {
      const message = this.dependencies.reader.read(job);
      await this.dependencies.sender.send(message);
    } catch {
      return this.handleFailure(claim);
    }
    return (await this.dependencies.outcomes.markSent(claim))
      ? 'sent'
      : 'lease_lost';
  }

  private async handleFailure(claim: ClaimedEmailJob): Promise<ProcessResult> {
    if (
      await this.dependencies.cleanup.failExhausted(
        claim,
        this.settings.maxAttempts,
      )
    )
      return 'failed';
    const retryAt = new Date(Date.now() + this.settings.retryDelayMs);
    return (await this.dependencies.outcomes.scheduleRetry(claim, retryAt))
      ? 'retry_scheduled'
      : 'not_scheduled';
  }
}
