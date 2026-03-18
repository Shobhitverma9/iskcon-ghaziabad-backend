import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { Document } from "mongoose"

export type DonationDocument = Donation & Document

@Schema({ timestamps: true, collection: "donations" })
export class Donation {
    @Prop({ type: String, ref: 'User' })
    userId: string

    @Prop({ required: true })
    donorName: string

    @Prop({ required: true })
    donorEmail: string

    @Prop({ required: true })
    donorPhone: string

    @Prop()
    pan: string

    @Prop({ required: true })
    amount: number

    @Prop({ required: false })
    fundId: number

    @Prop()
    address: string

    @Prop()
    city: string

    @Prop()
    state: string

    @Prop()
    pincode: string

    @Prop({ default: "pending", enum: ["pending", "completed", "failed"] })
    status: string

    @Prop()
    transactionId: string

    @Prop()
    ipAddress: string

    @Prop()
    ipState: string

    @Prop()
    ipCity: string

    @Prop()
    ipCountry: string

    @Prop({ type: Object })
    metadata: Record<string, any>

    // Explicitly declare timestamp and id fields for TypeScript
    _id: string
    createdAt: Date
    updatedAt: Date

    @Prop()
    type: string // 'one-time' or 'monthly'

    @Prop()
    category: string // 'Anna Daan', 'Gau Seva', etc.

    // Razorpay Integration Fields
    @Prop()
    razorpayOrderId: string

    @Prop()
    razorpayPaymentId: string

    @Prop()
    razorpaySignature: string

    @Prop()
    razorpaySubscriptionId: string

    @Prop({ default: "created", enum: ["created", "authorized", "captured", "failed", "refunded"] })
    paymentStatus: string

    // Receipt Generation Fields
    @Prop({ unique: true, sparse: true })
    receiptNumber: string // Format: "038011 11000"

    @Prop()
    receiptGeneratedAt: Date

    @Prop()
    receiptSentAt: Date
    @Prop({ default: false })
    reminderSent: boolean

    @Prop()
    lastReminderSentAt: Date

    @Prop()
    receiptUrl: string
}

export const DonationSchema = SchemaFactory.createForClass(Donation)

