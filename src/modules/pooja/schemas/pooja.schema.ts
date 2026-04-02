import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { Document } from "mongoose"

export type PoojaBookingDocument = PoojaBooking & Document

@Schema({ timestamps: true, collection: "pooja_bookings" })
export class PoojaBooking {
    @Prop({ type: String, ref: 'User' })
    userId: string

    @Prop({ required: true })
    devoteeName: string

    @Prop({ required: false })
    devoteEmail: string

    @Prop({ required: true })
    devotePhone: string

    @Prop()
    houseNo: string

    @Prop()
    street: string

    @Prop()
    city: string

    @Prop()
    state: string

    @Prop({ default: 'India' })
    country: string

    @Prop()
    pinCode: string

    @Prop()
    gotra: string

    @Prop({ required: true })
    poojaType: string

    @Prop({ required: true, default: 'online', enum: ['online', 'visit'] })
    attendanceMode: string

    @Prop({ required: true })
    poojaDate: Date

    @Prop({ required: true })
    amount: number

    @Prop()
    specialRequests: string

    @Prop()
    prasadamDelivery: string

    @Prop()
    query: string

    @Prop()
    occasion: string

    @Prop({
        default: "pending",
        enum: ["pending", "confirmed", "completed", "cancelled"],
    })
    status: string

    @Prop()
    pendingReason: string

    @Prop()
    priestName: string

    @Prop({ type: Object })
    metadata: Record<string, any>

    @Prop()
    razorpayOrderId: string

    @Prop()
    razorpayPaymentId: string

    @Prop()
    razorpaySignature: string

    @Prop({ type: [{ type: String, ref: 'PujaItem' }] })
    items: string[]
}

export const PoojaSchema = SchemaFactory.createForClass(PoojaBooking)

PoojaSchema.index({ poojaDate: 1, status: 1 })
