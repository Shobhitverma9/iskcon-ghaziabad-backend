import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { Document } from "mongoose"

export type PujaItemDocument = PujaItem & Document

@Schema({ timestamps: true, collection: "puja_items" })
export class PujaItem {
    @Prop({ required: true })
    title: string

    @Prop({ required: true })
    description: string

    @Prop({ required: true })
    price: number

    @Prop()
    image: string

    @Prop({ required: true, default: 'generel' })
    category: string

    @Prop({ required: true, default: 'item', enum: ['item', 'plate'] })
    type: string

    @Prop({ default: true })
    isActive: boolean
}

export const PujaItemSchema = SchemaFactory.createForClass(PujaItem)
