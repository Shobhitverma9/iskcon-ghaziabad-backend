import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { Document } from "mongoose"

export type DarshanDocument = Darshan & Document

@Schema({ timestamps: true })
export class Darshan {
    @Prop({ required: true, type: Date, index: true })
    date: Date

    @Prop({ required: true, enum: ["Sringar", "Mangla", "Festival", "Raj Bhoga", "Sandhya"] })
    type: string

    @Prop({ type: [String], default: [] })
    images: string[]
}

export const DarshanSchema = SchemaFactory.createForClass(Darshan)

// Compound index to ensure uniqueness of Date + Type
DarshanSchema.index({ date: 1, type: 1 }, { unique: true })
