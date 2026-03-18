import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { Document } from "mongoose"

export type VolunteerDocument = Volunteer & Document

@Schema({ timestamps: true, collection: "volunteers" })
export class Volunteer {
    @Prop({ required: true })
    fullName: string

    @Prop({ required: true })
    email: string

    @Prop({ required: true })
    phone: string

    @Prop()
    age: number

    @Prop()
    occupation: string

    @Prop()
    experience: string

    @Prop({ required: true, enum: ["weekdays", "weekends", "both"] })
    availability: string

    @Prop([String])
    selectedAreas: string[]

    @Prop()
    motivation: string

    @Prop({
        default: "pending",
        enum: ["pending", "approved", "rejected", "inactive"],
    })
    status: string

    @Prop({ type: Object })
    metadata: Record<string, any>
}

export const VolunteerSchema = SchemaFactory.createForClass(Volunteer)
