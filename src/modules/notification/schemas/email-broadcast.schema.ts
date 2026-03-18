import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { EmailTemplate } from './email-template.schema';

export type EmailBroadcastDocument = EmailBroadcast & Document;

@Schema({ timestamps: true, collection: 'email_broadcasts' })
export class EmailBroadcast {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'EmailTemplate', required: true })
  templateId: MongooseSchema.Types.ObjectId | EmailTemplate;

  @Prop({ type: [String], required: true })
  recipients: string[];

  @Prop({ required: true, enum: ['pending', 'sent', 'failed'], default: 'pending' })
  status: string;

  @Prop()
  sentAt?: Date;

  @Prop()
  error?: string;

  @Prop({ default: 0 })
  successCount: number;

  @Prop({ default: 0 })
  failureCount: number;
}

export const EmailBroadcastSchema = SchemaFactory.createForClass(EmailBroadcast);
