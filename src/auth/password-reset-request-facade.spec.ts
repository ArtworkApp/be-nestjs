import { Logger } from '@nestjs/common';
import { PasswordResetRequestFacade } from './password-reset-request-facade';
import { PasswordResetRequestService } from './password-reset-request.service';

describe('PasswordResetRequestFacade', () => {
  it('waits for both request processing and the minimum response delay', async () => {
    let finishDelay: () => void = () => undefined;
    const delay = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          finishDelay = resolve;
        }),
    );
    const requests = { request: jest.fn().mockResolvedValue(undefined) };
    const facade = new PasswordResetRequestFacade(
      requests as unknown as PasswordResetRequestService,
      delay,
    );
    let finished = false;
    const pending = facade.request('person@example.com').then(() => {
      finished = true;
    });
    await Promise.resolve();
    expect(finished).toBe(false);
    finishDelay();
    await pending;
    expect(requests.request).toHaveBeenCalledWith('person@example.com');
    expect(delay).toHaveBeenCalledWith(500);
  });

  it('returns the same result on queue failure and logs no error details', async () => {
    const log = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const requests = {
      request: jest
        .fn()
        .mockRejectedValue(new Error('sensitive@example.com secret-token')),
    };
    const facade = new PasswordResetRequestFacade(
      requests as unknown as PasswordResetRequestService,
      async () => undefined,
    );
    await expect(
      facade.request('sensitive@example.com'),
    ).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledWith(
      'Password reset request processing failed.',
    );
    log.mockRestore();
  });
});
