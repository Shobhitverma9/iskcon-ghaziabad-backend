import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { Document } from "mongoose"

export type CertificateDocument = Certificate & Document

@Schema({ timestamps: true, collection: "certificates" })
export class Certificate {
    @Prop({ type: String, ref: 'User', required: true })
    userId: string

    @Prop({ required: true })
    financialYear: string

    @Prop({ required: true })
    url: string

    @Prop({ required: true })
    issuedDate: Date

    @Prop({ type: Object })
    metadata: Record<string, any>
}

export const CertificateSchema = SchemaFactory.createForClass(Certificate)
