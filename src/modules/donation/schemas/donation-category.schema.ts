import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { Document } from "mongoose"

export type DonationCategoryDocument = DonationCategory & Document

@Schema({ timestamps: true, collection: "donation_categories" })
export class DonationCategory {
    @Prop({ required: true, unique: true })
    title: string

    @Prop({ required: true, unique: true })
    slug: string

    @Prop()
    description: string

    @Prop()
    image: string

    @Prop({ default: 0 })
    order: number

    @Prop({ default: true })
    isActive: boolean
}

export const DonationCategorySchema = SchemaFactory.createForClass(DonationCategory)
