import { EmailWorkerService } from './email-worker.service';

describe('EmailWorkerService', () => {
  function dependencies() {
    return {
      claims: { claim: jest.fn().mockResolvedValue([]) },
      processor: { process: jest.fn().mockResolvedValue('sent') },
      cleanup: { expireJobs: jest.fn().mockResolvedValue(0) },
    };
  }
  const settings = {
    pollIntervalMs: 1000,
    batchSize: 5,
    concurrency: 2,
    leaseDurationMs: 30000,
  };

  it('cleans expired jobs and processes a claimed batch', async () => {
    const services = dependencies();
    const jobs = [
      { id: '1', leaseId: 'a' },
      { id: '2', leaseId: 'b' },
    ];
    services.claims.claim.mockResolvedValue(jobs);
    const worker = new EmailWorkerService(services, settings);
    await worker.runOnce();
    expect(services.cleanup.expireJobs).toHaveBeenCalledTimes(1);
    expect(services.claims.claim).toHaveBeenCalledWith({
      batchSize: 5,
      leaseDurationMs: 30000,
    });
    expect(services.processor.process).toHaveBeenCalledTimes(2);
  });

  it('limits concurrent processing and waits for in-flight work on shutdown', async () => {
    const services = dependencies();
    services.claims.claim.mockResolvedValue([
      { id: '1', leaseId: 'a' },
      { id: '2', leaseId: 'b' },
      { id: '3', leaseId: 'c' },
    ]);
    let finish: () => void = () => undefined;
    services.processor.process.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = () => resolve('sent');
        }),
    );
    const worker = new EmailWorkerService(services, {
      ...settings,
      concurrency: 1,
    });
    const running = worker.runOnce();
    await Promise.resolve();
    await Promise.resolve();
    expect(services.processor.process).toHaveBeenCalledTimes(1);
    const shutdown = worker.onModuleDestroy();
    finish();
    await Promise.all([running, shutdown]);
    expect(services.processor.process).toHaveBeenCalledTimes(1);
  });

  it('does not start another batch while one is running', async () => {
    const services = dependencies();
    let finish: () => void = () => undefined;
    services.claims.claim.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = () => resolve([]);
        }),
    );
    const worker = new EmailWorkerService(services, settings);
    const first = worker.runOnce();
    await Promise.resolve();
    const second = worker.runOnce();
    expect(services.claims.claim).toHaveBeenCalledTimes(1);
    finish();
    await Promise.all([first, second]);
  });
});
