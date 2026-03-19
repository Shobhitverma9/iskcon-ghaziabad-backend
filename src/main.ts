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

  // Support comma-separated list of allowed origins, e.g.:
  // CORS_ORIGIN=https://iskconghaziabad.com,https://www.iskconghaziabad.com
  const rawOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000").split(",").map(o => o.trim()).filter(Boolean);
  // Also include SITE_URL and FRONTEND_URL (plain env vars always set in Cloud Run deploy)
  const siteUrl = process.env.SITE_URL?.trim();
  const frontendUrl = process.env.FRONTEND_URL?.trim();
  // Always include localhost for dev convenience
  const allowedOrigins = Array.from(new Set([
    ...rawOrigins,
    ...(siteUrl ? [siteUrl] : []),
    ...(frontendUrl ? [frontendUrl] : []),
    "http://localhost:3000",
  ]));
  console.log(`[Bootstrap] CORS allowed origins: ${allowedOrigins.join(", ")}`);
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, Postman, curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
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
