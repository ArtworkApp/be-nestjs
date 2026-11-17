import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { EmailPayloadProtector } from '../src/email/email-payload-protector';
import { EmailJobService } from '../src/email/email-job.service';
import { EmailJobReaderService } from '../src/email/email-job-reader.service';
import { EmailWorkerLauncher } from '../src/email/email-worker-launcher';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(EmailPayloadProtector)
      .useValue({})
      .overrideProvider(EmailJobService)
      .useValue({})
      .overrideProvider(EmailJobReaderService)
      .useValue({})
      .overrideProvider(EmailWorkerLauncher)
      .useValue({})
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer()).get('/').expect(200).expect({
      message: 'Configuration-only mode. See Swagger docs.',
      swagger: '/api/v1/docs',
    });
  });
});
