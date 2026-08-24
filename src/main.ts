import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { AppModule } from './app.module';
import { ValidationErrorFilter } from './common/filters/validation-error.filter';

async function bootstrap() {
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.DATABASE_SYNCHRONIZE === 'true'
  ) {
    throw new Error(
      'DATABASE_SYNCHRONIZE=true no permitido en produccion. Establece DATABASE_SYNCHRONIZE=false',
    );
  }

  const app = await NestFactory.create(AppModule);

  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : true;

  app.enableCors({
    origin: corsOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Aumentar límite de payload para permitir upload de CSV/Excel grandes
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  app.useGlobalFilters(new ValidationErrorFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((err) => {
  console.error('Error starting application:', err);
  process.exit(1);
});
