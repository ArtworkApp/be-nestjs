import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { CustomLoggerService } from './common/logger/logger.service';
import configuration, { configValidationSchema } from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: configValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: true,
      },
    }),
  ],
  controllers: [AppController],
  providers: [CustomLoggerService],
})
export class AppModule {}
