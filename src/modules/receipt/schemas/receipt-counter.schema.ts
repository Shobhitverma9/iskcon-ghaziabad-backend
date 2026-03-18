import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type ReceiptCounterDocument = ReceiptCounter & Document

/**
 * Receipt Counter Schema
 * Used for generating sequential receipt numbers
 * Format: 038011 + sequential counter (starting from 11000)
 */
@Schema({ timestamps: true, collection: 'receipt_counter' })
export class ReceiptCounter {
    @Prop({ required: true, default: 'donation_receipt' })
    name: string // Counter identifier

    @Prop({ required: true, default: 11000 })
    sequence: number // Current sequence number

    @Prop({ default: '038011' })
    prefix: string // Fixed prefix for all receipts
}

export const ReceiptCounterSchema = SchemaFactory.createForClass(ReceiptCounter)

// Create unique index on name to prevent duplicates
ReceiptCounterSchema.index({ name: 1 }, { unique: true })
