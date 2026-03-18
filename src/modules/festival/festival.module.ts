import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FestivalService } from './festival.service';
import { FestivalController } from './festival.controller';
import { Festival, FestivalSchema } from './schemas/festival.schema';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Festival.name, schema: FestivalSchema }]),
    ],
    controllers: [FestivalController],
    providers: [FestivalService],
    exports: [FestivalService],
})
export class FestivalModule { }
