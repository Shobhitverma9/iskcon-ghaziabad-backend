import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SongCategoriesController } from './song-categories.controller';
import { SongCategoriesService } from './song-categories.service';
import { SongCategory, SongCategorySchema } from './schemas/song-category.schema';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: SongCategory.name, schema: SongCategorySchema }]),
    ],
    controllers: [SongCategoriesController],
    providers: [SongCategoriesService],
    exports: [SongCategoriesService],
})
export class SongCategoriesModule { }
