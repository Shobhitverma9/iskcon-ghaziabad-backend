import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SessionDocument = Session & Document;

@Schema({ collection: 'sessions', timestamps: true })
export class Session {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId;

    @Prop({ required: true, unique: true })
    token: string;

    @Prop({ required: true })
    expiresAt: Date;

    @Prop({ default: true })
    isActive: boolean;

    @Prop()
    ipAddress?: string;

    @Prop()
    userAgent?: string;

    createdAt: Date;
}

export const SessionSchema = SchemaFactory.createForClass(Session);

// Indexes
SessionSchema.index({ userId: 1 });
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
SessionSchema.index({ isActive: 1 });
