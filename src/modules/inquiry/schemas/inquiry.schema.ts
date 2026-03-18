import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { Document } from "mongoose"

export type InquiryDocument = Inquiry & Document

@Schema({ timestamps: true })
export class Inquiry {
    @Prop({ required: true })
    name: string

    @Prop({ required: true })
    email: string

    @Prop()
    phone: string

    @Prop()
    address: string

    @Prop()
    details: string

    @Prop({ required: true })
    type: string // e.g., "Request Krishna Prasad", "Speak with Priest"

    @Prop({ default: 'new' }) // new, in-progress, resolved
    status: string

    createdAt?: Date
    updatedAt?: Date
}

export const InquirySchema = SchemaFactory.createForClass(Inquiry)
