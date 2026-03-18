import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { SongCategory } from '../../song-categories/schemas/song-category.schema';

export type SongDocument = Song & Document;

@Schema()
class Lyrics {
    @Prop()
    devanagari: string;

    @Prop()
    iast: string;

    @Prop()
    english: string;
}

@Schema({ timestamps: true })
export class Song {
    @Prop({ required: true })
    title: string;

    @Prop({ required: true })
    author: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'SongCategory', required: true })
    category: SongCategory;

    @Prop({ required: true })
    audioUrl: string;

    @Prop({ unique: true })
    slug: string;

    @Prop({ type: Lyrics })
    lyrics: Lyrics;

    @Prop()
    duration: number;

    @Prop({ default: true })
    isActive: boolean;
}

export const SongSchema = SchemaFactory.createForClass(Song);
