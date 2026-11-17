import { Logger } from '@nestjs/common';
import { EmailJobProcessorService } from './email-job-processor.service';

describe('EmailJobProcessorService', () => {
  const claim = { id: 'job-id', leaseId: 'lease-id' };
  const message = {
    to: 'person@example.com',
    subject: 'Subject',
    text: 'Text',
    html: 'HTML',
  };
  const job = {
    id: 'job-id',
    attempts: 1,
    payloadKeyId: 'key-1',
    encryptedPayload: Buffer.from('encrypted'),
  };
  const settings = { maxAttempts: 3, retryDelayMs: 60000 };
  function createDependencies() {
    return {
      loader: { load: jest.fn().mockResolvedValue(job) },
      reader: { read: jest.fn().mockReturnValue(message) },
      sender: { send: jest.fn().mockResolvedValue(undefined) },
      outcomes: {
        markSent: jest.fn().mockResolvedValue(true),
        scheduleRetry: jest.fn().mockResolvedValue(true),
      },
      cleanup: { failExhausted: jest.fn().mockResolvedValue(false) },
    };
  }
  let dependencies: ReturnType<typeof createDependencies>;
  let processor: EmailJobProcessorService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2030-01-01T00:00:00Z'));
    dependencies = createDependencies();
    processor = new EmailJobProcessorService(dependencies, settings);
  });
  afterEach(() => jest.useRealTimers());

  it('sends an eligible message and records its success', async () => {
    await expect(processor.process(claim)).resolves.toBe('sent');
    expect(dependencies.reader.read).toHaveBeenCalledWith(job);
    expect(dependencies.sender.send).toHaveBeenCalledWith(message);
    expect(dependencies.outcomes.markSent).toHaveBeenCalledWith(claim);
  });

  it('does not send a job that is no longer eligible', async () => {
    dependencies.loader.load.mockResolvedValue(null);
    await expect(processor.process(claim)).resolves.toBe('unavailable');
    expect(dependencies.sender.send).not.toHaveBeenCalled();
  });

  it('schedules a retry after delivery fails', async () => {
    dependencies.sender.send.mockRejectedValue(new Error('provider failure'));
    await expect(processor.process(claim)).resolves.toBe('retry_scheduled');
    expect(dependencies.outcomes.scheduleRetry).toHaveBeenCalledWith(
      claim,
      new Date('2030-01-01T00:01:00Z'),
    );
  });

  it('logs which processing stage failed without logging error details', async () => {
    const log = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    dependencies.reader.read.mockImplementation(() => {
      throw new Error('secret-token');
    });
    await processor.process(claim);
    expect(log).toHaveBeenCalledWith('Email job payload could not be read.');
    log.mockRestore();
  });

  it('marks the last failed attempt as failed rather than retrying', async () => {
    dependencies.sender.send.mockRejectedValue(new Error('provider failure'));
    dependencies.cleanup.failExhausted.mockResolvedValue(true);
    await expect(processor.process(claim)).resolves.toBe('failed');
    expect(dependencies.outcomes.scheduleRetry).not.toHaveBeenCalled();
  });

  it('reports a lost lease when the outcome cannot be recorded', async () => {
    dependencies.outcomes.markSent.mockResolvedValue(false);
    await expect(processor.process(claim)).resolves.toBe('lease_lost');
  });

  it('does not resend a job reclaimed after its attempt limit', async () => {
    dependencies.loader.load.mockResolvedValue({ ...job, attempts: 4 });
    dependencies.cleanup.failExhausted.mockResolvedValue(true);
    await expect(processor.process(claim)).resolves.toBe('failed');
    expect(dependencies.sender.send).not.toHaveBeenCalled();
  });

  it('propagates database failures after sending instead of treating them as delivery failures', async () => {
    const error = new Error('database unavailable');
    dependencies.outcomes.markSent.mockRejectedValue(error);
    await expect(processor.process(claim)).rejects.toBe(error);
    expect(dependencies.outcomes.scheduleRetry).not.toHaveBeenCalled();
  });
});
