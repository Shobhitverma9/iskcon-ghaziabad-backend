import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SongCategoryDocument = SongCategory & Document;

@Schema({ timestamps: true })
export class SongCategory {
    @Prop({ required: true })
    title: string;

    @Prop({ required: true, unique: true })
    slug: string;

    @Prop({ default: 0 })
    order: number;

    @Prop()
    description: string;

    @Prop({ default: true })
    isActive: boolean;
}

export const SongCategorySchema = SchemaFactory.createForClass(SongCategory);
