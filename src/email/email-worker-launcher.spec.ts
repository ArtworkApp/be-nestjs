import { ConfigService } from '@nestjs/config';
import { EmailWorkerLauncher } from './email-worker-launcher';

describe('EmailWorkerLauncher', () => {
  function config(mode: string): ConfigService {
    return {
      get: (key: string) =>
        ({ EMAIL_WORKER_MODE: mode, NODE_ENV: 'development' }[key]),
    } as ConfigService;
  }

  it('starts and closes a local worker context', async () => {
    const close = jest.fn().mockResolvedValue(undefined);
    const start = jest.fn().mockResolvedValue({ close });
    const launcher = new EmailWorkerLauncher(config('local'), start);
    await launcher.onModuleInit();
    expect(start).toHaveBeenCalledTimes(1);
    await launcher.onModuleDestroy();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it.each(['disabled', 'standalone'])(
    'does not start an API worker in %s mode',
    async (mode) => {
      const start = jest.fn();
      const launcher = new EmailWorkerLauncher(config(mode), start);
      await launcher.onModuleInit();
      await launcher.onModuleDestroy();
      expect(start).not.toHaveBeenCalled();
    },
  );
});
