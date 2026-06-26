import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type YatraBookingDocument = YatraBooking & Document;

@Schema({ timestamps: true })
export class YatraBooking {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  phone: string;

  @Prop()
  address: string;

  @Prop({ required: true, default: 'Kedarnath-Badrinath 2026' })
  yatraName: string;

  @Prop({ required: true, default: 1 })
  numberOfPersons: number;

  @Prop({ required: true })
  totalAmount: number;

  @Prop({ required: true, default: 0 })
  amountPaid: number;

  @Prop({ required: true, enum: ['advance', 'full'] })
  paymentType: string;

  @Prop({ required: true, enum: ['pending', 'partial', 'paid', 'failed'], default: 'pending' })
  status: string;

  @Prop()
  razorpayOrderId: string;

  @Prop()
  razorpayPaymentId: string;

  @Prop()
  razorpaySignature: string;
}

export const YatraBookingSchema = SchemaFactory.createForClass(YatraBooking);
