import { NestFactory } from '@nestjs/core';
import { EmailWorkerRootModule } from './email/email-worker-root.module';

async function bootstrap(): Promise<void> {
  if (process.env.EMAIL_WORKER_MODE !== 'standalone') {
    throw new Error(
      'The worker process requires EMAIL_WORKER_MODE=standalone.',
    );
  }
  const app = await NestFactory.createApplicationContext(EmailWorkerRootModule);
  app.enableShutdownHooks();
}

void bootstrap();
