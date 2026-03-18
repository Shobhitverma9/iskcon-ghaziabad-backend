import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { StorageService } from './shared/storage/storage.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const storageService = app.get(StorageService);

    console.log('Testing Cloudinary Upload...');

    // Create a dummy PDF buffer
    const buffer = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Title (Test) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF', 'utf-8');
    const filename = `test-no-ext-${Date.now()}`;

    try {
        const url = await storageService.uploadFile(buffer, filename, 'application/pdf', 'raw');
        console.log('Upload successful!');
        console.log('URL:', url);
    } catch (error) {
        console.error('Upload failed:', error);
    }

    await app.close();
}

bootstrap();
