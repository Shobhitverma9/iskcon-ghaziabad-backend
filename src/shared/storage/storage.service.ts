
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';

@Injectable()
export class StorageService {
    private readonly logger = new Logger(StorageService.name);

    constructor(private configService: ConfigService) {
        cloudinary.config({
            cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME')?.trim(),
            api_key: this.configService.get<string>('CLOUDINARY_API_KEY')?.trim(),
            api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET')?.trim(),
        });
    }

    async uploadFile(file: Buffer, filename: string, contentType: string = 'image/webp', resourceType: 'auto' | 'image' | 'video' | 'raw' = 'auto'): Promise<string> {
        this.logger.log(`Uploading to Cloudinary: ${filename} (Type: ${resourceType})`);
        return new Promise((resolve, reject) => {
            // Include extension for raw files to ensure user-friendly URLs now that PDF delivery is enabled
            const publicId = resourceType === 'raw' ? filename : filename.replace(/\.[^/.]+$/, "");

            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    public_id: publicId,
                    resource_type: resourceType,
                    overwrite: true,
                },
                (error, result) => {
                    if (error) {
                        this.logger.error(`Failed to upload file: ${filename}`, error);
                        return reject(error);
                    }
                    this.logger.log(`Cloudinary upload successful: ${result.secure_url}`);
                    this.logger.log(`Full Cloudinary result: ${JSON.stringify(result, null, 2)}`);
                    resolve(result.secure_url);
                }
            );

            streamifier.createReadStream(file).pipe(uploadStream);
        });
    }
}
