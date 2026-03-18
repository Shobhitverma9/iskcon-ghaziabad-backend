import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const cacheManager = app.get<Cache>(CACHE_MANAGER);

    console.log('Clearing cache...');
    await cacheManager.reset();
    console.log('Cache cleared successfully.');

    await app.close();
}

bootstrap();
