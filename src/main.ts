import { NestFactory } from "@nestjs/core"
import { ValidationPipe } from "@nestjs/common"
import { AppModule } from "./app.module"
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.enableCors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  })

  app.setGlobalPrefix("api")
  app.use(cookieParser());
  app.use(helmet());

  console.log("[Bootstrap] Middleware (cookieParser, helmet) initialized");

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  const port = process.env.PORT || 3001

  const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/iskcon-ghaziabad";
  console.log(`[Bootstrap] MONGODB_URI: ${mongoUri.replace(/:[^:]*@/, ':****@')}`); // Mask password if present

  await app.listen(port)
  console.log(`🚀 Server running on http://localhost:${port}`)
}

bootstrap()
