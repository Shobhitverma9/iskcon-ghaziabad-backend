
import { ImageProcessingService } from './src/shared/image/image-processing.service';
import { StorageService } from './src/shared/storage/storage.service';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

async function testUpload() {
    const configService = new ConfigService({
        CLOUDINARY_CLOUD_NAME: 'ddcfe7ux2',
        CLOUDINARY_API_KEY: '886133274712621',
        CLOUDINARY_API_SECRET: 'UL0NOTNB5vLKTP83iJuFYGaZaNw',
    });

    const imageProcessingService = new ImageProcessingService();
    const storageService = new StorageService(configService);

    try {
        console.log('Reading test image...');
        const testImagePath = path.join(__dirname, 'test.png');
        if (!fs.existsSync(testImagePath)) {
            console.error('Test image not found at:', testImagePath);
            return;
        }
        const buffer = fs.readFileSync(testImagePath);

        console.log('Processing image...');
        const processedBuffer = await imageProcessingService.processImage(buffer);
        console.log('Image processed. Size:', processedBuffer.length);

        console.log('Uploading to Cloudinary...');
        const filename = `test/repro-${Date.now()}.webp`;
        const url = await storageService.uploadFile(processedBuffer, filename);
        console.log('Upload successful! URL:', url);
    } catch (error) {
        console.error('Reproduction failed:', error);
    }
}

testUpload();
