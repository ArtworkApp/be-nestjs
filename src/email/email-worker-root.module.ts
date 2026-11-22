import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configValidationSchema } from '../config/configuration';
import { EmailWorkerRuntimeModule } from './email-worker-runtime.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validationSchema: configValidationSchema,
    }),
    EmailWorkerRuntimeModule,
  ],
})
export class EmailWorkerRootModule {}
