import { NestFactory } from "@nestjs/core"
import { ValidationPipe } from "@nestjs/common"
import { AppModule } from "./app.module"
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { HttpAdapterHost } from '@nestjs/core';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  const corsOrigin = (process.env.CORS_ORIGIN || "http://localhost:3000").trim();
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  })

  app.setGlobalPrefix("api")
  const port = process.env.PORT || 3001

  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(app.get(HttpAdapterHost)));

  app.use(cookieParser());
  app.use(helmet());
  
  // Increase body size limits for uploads
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  console.log("[Bootstrap] Middleware (cookieParser, helmet, filters, body-limits, pipes) initialized");

  const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/iskcon-ghaziabad";
  console.log(`[Bootstrap] MONGODB_URI: ${mongoUri.replace(/:[^:]*@/, ':****@')}`); // Mask password if present

  await app.listen(port)
  console.log(`🚀 Server running on http://localhost:${port}`)
}

bootstrap()
