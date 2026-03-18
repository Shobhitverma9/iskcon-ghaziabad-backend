import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BannersController } from './banners.controller';
import { BannersService } from './banners.service';
import { Banner, BannerSchema } from './schemas/banner.schema';
import { StorageModule } from '../../shared/storage/storage.module';
import { ImageProcessingService } from '../../shared/image/image-processing.service';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Banner.name, schema: BannerSchema }]),
        StorageModule,
    ],
    controllers: [BannersController],
    providers: [BannersService, ImageProcessingService],
})
export class BannersModule { }
