import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ collection: 'users', timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ default: 'user', enum: ['user', 'admin', 'seo', 'accounts'] })
  role: string;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop({ default: 0 })
  loginAttempts: number;

  @Prop()
  lastLogin?: Date;

  @Prop()
  emailVerificationToken?: string;

  @Prop()
  passwordResetToken?: string;

  @Prop()
  gotra?: string;

  @Prop()
  dob?: Date;

  @Prop()
  pan?: string;

  @Prop()
  otp?: string;

  @Prop()
  otpExpiresAt?: Date;

  @Prop({ default: 'Indian', enum: ['Indian', 'Foreigner'] })
  citizenType?: string;

  @Prop({ enum: ['Male', 'Female'] })
  gender?: string;

  @Prop({ enum: ['Single', 'Married'] })
  maritalStatus?: string;

  @Prop()
  address?: string;

  @Prop()
  city?: string;

  @Prop()
  state?: string;

  @Prop()
  pincode?: string;

  @Prop({ default: true })
  isSubscribed: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes
UserSchema.index({ createdAt: 1 });
