import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { json } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers via helmet (SEC-003)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      hsts:
        process.env.NODE_ENV === 'production'
          ? { maxAge: 31536000, includeSubDomains: true }
          : false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // Explicit body size limit (SEC-019) — configurable via BODY_LIMIT_MB env var
  app.use(json({ limit: process.env.BODY_LIMIT_MB ? `${process.env.BODY_LIMIT_MB}mb` : '10mb' }));

  // Parse cookies (required for session auth)
  app.use(cookieParser());

  // Enable CORS for frontend (SEC-024: reject wildcard at startup)
  const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:33000',
  ];

  if (allowedOrigins.includes('*')) {
    throw new Error('CORS_ORIGINS must not contain wildcard (*). Set specific origins.');
  }

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Set global API prefix
  app.setGlobalPrefix('api');

  // Enable global validation pipe for all DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // Register global exception filter (catches Prisma errors, returns safe messages)
  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost));

  // Only enable Swagger in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('ktb.clubmanager API')
      .setDescription('Club management and double-entry accounting API for German Vereine')
      .setVersion('0.1.0')
      .setLicense('AGPL-3.0', 'https://www.gnu.org/licenses/agpl-3.0')
      .addTag('health', 'Health check endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document, {
      customSiteTitle: 'ktb.clubmanager API',
      customCss: '.swagger-ui .topbar { background-color: #0f2478; }',
    });
  }

  // API port: use API_PORT if set, otherwise PORT+1, otherwise 3001
  const basePort = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const port = process.env.API_PORT ?? basePort + 1;
  await app.listen(port);

  console.log(`Application is running on: http://localhost:${port}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Swagger docs available at: http://localhost:${port}/docs`);
  }
}
bootstrap();
