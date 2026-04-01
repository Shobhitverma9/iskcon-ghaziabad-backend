import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { StorageService } from '../src/shared/storage/storage.service';
import * as fs from 'fs';
import * as path from 'path';

async function uploadImage() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const storageService = app.get(StorageService);

  const imagePath = path.join('C:', 'Users', 'SHOBHIT', '.gemini', 'antigravity', 'brain', '23ae814a-36d2-48ce-af5f-3b4339c058c8', 'kamada_ekadashi_spiritual_offering_png_1774618872213.png');
  
  if (!fs.existsSync(imagePath)) {
    console.error(`❌ Source image not found at: ${imagePath}`);
    await app.close();
    return;
  }

  const fileBuffer = fs.readFileSync(imagePath);
  
  console.log('Uploading Kamada Ekadashi image to Cloudinary...');
  try {
    const url = await storageService.uploadFile(
      fileBuffer, 
      'kamada-ekadashi-2026', 
      'image/png', 
      'image'
    );
    console.log(`✅ Upload successful! Public URL: ${url}`);
  } catch (error) {
    console.error('❌ Upload failed:', error.message);
  } finally {
    await app.close();
  }
}

uploadImage();
