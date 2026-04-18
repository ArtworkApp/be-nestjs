import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { CustomLoggerService } from './common/logger/logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new CustomLoggerService(),
  });

  const configService = app.get(ConfigService);
  const port = configService.get('app.port');
  const apiPrefix = configService.get('app.apiPrefix');

  // Security middleware
  app.use(helmet());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Keep index endpoint on '/' while namespaced routes stay under API prefix.
  app.setGlobalPrefix(apiPrefix, { exclude: ['/'] });

  // CORS configuration
  app.enableCors({
    origin:
      process.env.NODE_ENV === 'production'
        ? ['https://your-frontend-domain.com']
        : true,
    credentials: true,
  });

  // Swagger documentation
  if (configService.get('app.nodeEnv') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Artwork Marketplace API')
      .setDescription('Configuration-only API mode with minimal endpoints.')
      .setVersion('1.0')
      .addTag('system', 'System and documentation endpoints')
      .addServer(`http://localhost:${port}/${apiPrefix}`, 'Development server')
      .setContact(
        'API Support',
        'https://github.com/your-repo/artwork-marketplace',
        'support@artworkmarketplace.com',
      )
      .setLicense('MIT', 'https://opensource.org/licenses/MIT')
      .build();

    const document = SwaggerModule.createDocument(app, config, {
      operationIdFactory: (controllerKey: string, methodKey: string) =>
        methodKey,
    });

    SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
      customSiteTitle: 'Artwork Marketplace API Documentation',
      customfavIcon: '/favicon.ico',
      customCss: `
        .topbar-wrapper .link {
          content: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjMDA3M0U2Ii8+Cjwvc3ZnPgo=');
          width: 120px;
          height: auto;
        }
        .swagger-ui .topbar { background-color: #1976d2; }
      `,
    });
  }

  await app.listen(port);
  console.log(
    `🚀 Artwork Marketplace API running on http://localhost:${port}/${apiPrefix}`,
  );

  if (configService.get('app.nodeEnv') !== 'production') {
    console.log(
      `📚 API Documentation available at http://localhost:${port}/${apiPrefix}/docs`,
    );
  }
}

bootstrap();
