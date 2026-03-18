import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { Document } from "mongoose"

export type SubscriptionDocument = Subscription & Document

@Schema({ timestamps: true, collection: "subscriptions" })
export class Subscription {
    @Prop({ type: String, ref: 'User', required: false })
    userId: string

    @Prop({ required: true })
    amount: number

    @Prop({ required: true, enum: ['monthly', 'yearly'] })
    frequency: string

    @Prop({ required: true, enum: ['created', 'active', 'cancelled', 'paused', 'failed'], default: 'created' })
    status: string

    @Prop({ required: true })
    nextPaymentDate: Date

    @Prop({ required: true })
    category: string // e.g. 'donate-gau-seva', 'annadan'

    @Prop({ default: false })
    isNityaSeva: boolean

    @Prop()
    paymentMethodId: string

    @Prop({ type: Object })
    metadata: Record<string, any>

    // Razorpay eNACH Integration Fields
    @Prop()
    razorpayCustomerId: string

    @Prop()
    razorpayPlanId: string

    @Prop()
    razorpaySubscriptionId: string

    @Prop()
    mandateId: string

    @Prop({ enum: ['created', 'authenticated', 'active', 'paused', 'halted', 'cancelled', 'completed', 'expired'] })
    razorpayStatus: string
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription)
