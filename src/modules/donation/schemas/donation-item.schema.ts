import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { Document, Schema as MongooseSchema } from "mongoose"
import { DonationCategory } from "./donation-category.schema"

export type DonationItemDocument = DonationItem & Document

@Schema({ timestamps: true, collection: "donation_items" })
export class DonationItem {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: "DonationCategory", required: true })
    category: DonationCategory

    @Prop({ required: true })
    title: string

    @Prop()
    description: string

    @Prop()
    subCategory: string

    @Prop()
    image: string

    @Prop()
    defaultAmount: number

    @Prop({ default: false })
    isCustomAmount: boolean

    @Prop({ default: true })
    isActive: boolean
}

export const DonationItemSchema = SchemaFactory.createForClass(DonationItem)
