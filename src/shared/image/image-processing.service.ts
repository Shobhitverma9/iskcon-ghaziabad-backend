import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';

@Injectable()
export class ImageProcessingService {
    private readonly logger = new Logger(ImageProcessingService.name);

    async processImage(buffer: Buffer): Promise<Buffer> {
        try {
            return await sharp(buffer)
                .resize(1920, 1080, {
                    fit: 'inside', // Resize to fit within 1920x1080 while maintaining aspect ratio
                    withoutEnlargement: true // Do not enlarge if image is smaller
                })
                .webp({ quality: 80 }) // Convert to WebP with 80% quality
                .toBuffer();
        } catch (error) {
            this.logger.error('Failed to process image', error);
            throw error;
        }
    }
}
