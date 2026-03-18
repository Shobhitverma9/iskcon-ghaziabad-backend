import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DonationSettingsDocument = DonationSettings & Document;

@Schema({ timestamps: true })
export class DonationSettings {
    @Prop({ required: true, default: 'ICICI BANK' })
    bankName: string;

    @Prop({ required: true, default: 'ISKCON' })
    accountName: string;

    @Prop({ required: true, default: '628601046447' })
    accountNumber: string;

    @Prop({ required: true, default: 'ICIC0006286' })
    ifscCode: string;

    @Prop({ required: true, default: 'iskconrajnagar@icici' })
    upiId: string;

    @Prop()
    qrCodeUrl: string;
}

export const DonationSettingsSchema = SchemaFactory.createForClass(DonationSettings);
