import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readEmailWorkerConfig } from './email-worker-config';

interface WorkerContext {
  close(): Promise<void>;
}

export class EmailWorkerLauncher implements OnModuleInit, OnModuleDestroy {
  private context: WorkerContext | undefined;

  constructor(
    private readonly config: ConfigService,
    private readonly start: () => Promise<WorkerContext>,
  ) {}

  async onModuleInit(): Promise<void> {
    if (readEmailWorkerConfig(this.config, 'api').enabled) {
      this.context = await this.start();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.context?.close();
  }
}
