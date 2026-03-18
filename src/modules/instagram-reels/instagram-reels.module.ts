import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InstagramReelsController } from './instagram-reels.controller';
import { InstagramReelsService } from './instagram-reels.service';
import { InstagramReel, InstagramReelSchema } from './instagram-reels.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: InstagramReel.name, schema: InstagramReelSchema },
        ]),
    ],
    controllers: [InstagramReelsController],
    providers: [InstagramReelsService],
})
export class InstagramReelsModule { }
