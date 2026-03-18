import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type InstagramReelDocument = InstagramReel & Document;

@Schema({ timestamps: true })
export class InstagramReel {
    @Prop({ required: true })
    title: string;

    @Prop()
    caption: string;

    @Prop()
    videoUrl: string;

    @Prop()
    videoWebmUrl: string;

    @Prop()
    videoMp4Url: string;

    @Prop({ required: true })
    thumbnailUrl: string;

    @Prop({ default: 0 })
    views: number;

    @Prop({ default: true })
    isVisible: boolean;

    @Prop({ default: 0 })
    order: number;
}

export const InstagramReelSchema = SchemaFactory.createForClass(InstagramReel);
