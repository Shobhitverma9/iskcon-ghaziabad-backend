import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BannerDocument = Banner & Document;

@Schema()
export class Banner {
    @Prop({ required: true })
    imageUrl: string;

    @Prop()
    mobileImageUrl: string;

    @Prop()
    title: string;

    @Prop()
    subtitle: string;

    @Prop()
    description: string;

    @Prop({ default: 'center' })
    titleAlignment: string;

    @Prop({ default: 'center' })
    subtitleAlignment: string;

    @Prop({ default: 'center' })
    descriptionAlignment: string;

    @Prop({ default: 'center' })
    buttonAlignment: string;

    @Prop({ default: 0 })
    titleTopSpacing: number;

    @Prop({ default: 16 })
    titleSpacing: number;

    @Prop({ default: 0 })
    subtitleTopSpacing: number;

    @Prop({ default: 16 })
    subtitleSpacing: number;

    @Prop({ default: 0 })
    descriptionTopSpacing: number;

    @Prop({ default: 16 })
    descriptionSpacing: number;

    @Prop({ default: 0 })
    buttonTopSpacing: number;

    @Prop({ default: '#ffffff' })
    titleColor: string;

    @Prop({ default: 80 })
    titleFontSize: number;

    @Prop({ default: '#FF9933' })
    subtitleColor: string;

    @Prop({ default: 40 })
    subtitleFontSize: number;

    @Prop({ default: '#ffffff' })
    descriptionColor: string;

    @Prop({ default: 20 })
    descriptionFontSize: number;

    @Prop({ default: '#ffffff' })
    buttonTextColor: string;

    @Prop({ default: '#FF9933' })
    buttonBgColor: string;

    @Prop()
    ctaText: string;

    @Prop()
    ctaLink: string;

    @Prop({ required: true, default: 0 })
    order: number;
}

export const BannerSchema = SchemaFactory.createForClass(Banner);
