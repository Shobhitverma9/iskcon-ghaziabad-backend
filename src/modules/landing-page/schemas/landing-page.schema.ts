import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { Document } from "mongoose"

export type LandingPageDocument = LandingPage & Document

@Schema({ timestamps: true })
export class LandingPage {
    @Prop({ required: true })
    title: string

    @Prop({ required: true, unique: true })
    slug: string

    @Prop({ required: false })
    headerTitle?: string

    @Prop({ default: true })
    isActive: boolean

    @Prop({ type: Object })
    hero: {
        backgroundImage: string
        mobileBackgroundImage?: string
        title?: string
        subtitle?: string
        description?: string
        buttonText: string
        buttonScrollId?: string
        buttonLink?: string
        showHareKrishnaBadge?: boolean
        showSeparator?: boolean
    }

    @Prop({
        type: [
            {
                type: { type: String, required: true, enum: ['stats', 'content', 'donation', 'grid', 'media', 'custom_donation', 'pooja_offerings', 'separator'] },
                content: { type: Object, required: true }, // Polymorphic content based on type
                _id: false
            }
        ]
    })
    sections: {
        type: 'stats' | 'content' | 'donation' | 'grid' | 'media' | 'custom_donation' | 'pooja_offerings' | 'separator'
        content: any
    }[]
}

export const LandingPageSchema = SchemaFactory.createForClass(LandingPage)
