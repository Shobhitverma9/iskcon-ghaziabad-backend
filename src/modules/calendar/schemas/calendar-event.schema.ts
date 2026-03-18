import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CalendarEventDocument = CalendarEvent & Document;

@Schema({ timestamps: true })
export class CalendarEvent {
    @Prop({ required: true, index: true })
    date: Date;

    @Prop({ required: true })
    title: string;

    @Prop()
    description: string;

    @Prop()
    location: string;

    @Prop({ default: 'general' })
    type: string; // e.g., 'ekadasi', 'festival', 'appearance', 'disappearance'

    @Prop({ type: Object })
    meta: Record<string, any>; // Extra data like fasting times, break fast times, etc.

    @Prop()
    uid: string; // Unique ID from ICS to prevent duplicates

    @Prop()
    image: string; // URL to the event image

    @Prop({ type: [{ title: String, amount: String, description: String }] })
    sponsorshipDetails: { title: string; amount: string; description: string }[];
}

export const CalendarEventSchema = SchemaFactory.createForClass(CalendarEvent);
