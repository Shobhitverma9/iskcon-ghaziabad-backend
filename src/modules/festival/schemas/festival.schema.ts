import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FestivalDocument = Festival & Document;

@Schema({ timestamps: true })
export class Festival {
    @Prop({ required: true })
    title: string;

    @Prop({ required: true, unique: true, index: true })
    slug: string;

    @Prop()
    description: string;

    @Prop()
    startDate: Date;

    @Prop()
    endDate: Date;

    @Prop()
    expirationDate: Date;

    @Prop([String])
    images: string[];

    @Prop({
        type: [{
            name: { type: String, required: true },
            description: String,
            amount: { type: Number, required: true },
            image: String,
        }],
    })
    sponsorshipItems: {
        name: string;
        description: string;
        amount: number;
        image?: string;
    }[];

    @Prop({ default: true })
    isActive: boolean;

    @Prop()
    linkUrl?: string;

    @Prop()
    desktopImageUrl?: string;

    @Prop()
    mobileImageUrl?: string;
}

export const FestivalSchema = SchemaFactory.createForClass(Festival);
