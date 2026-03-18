import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ExternalLinkDocument = ExternalLink & Document;

@Schema({ timestamps: true, collection: "external_links" })
export class ExternalLink {
    @Prop({ required: true })
    url: string;

    @Prop({ required: true })
    title: string; // Optional title for reference

    @Prop({ default: 'external' })
    type: string;

    @Prop({ required: true, default: Date.now })
    publishedAt: Date;
}

export const ExternalLinkSchema = SchemaFactory.createForClass(ExternalLink);
