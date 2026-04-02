
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { Document } from "mongoose"

export type ContactSettingsDocument = ContactSettings & Document

@Schema({ timestamps: true })
export class ContactSettings {
    @Prop({ default: "Sri Sri Radha Madan Mohan Temple" })
    templeName: string

    @Prop({ default: "R-11/35, Sector 11, Raj Nagar, Ghaziabad, Uttar Pradesh 201002" })
    address: string

    @Prop({ default: "https://www.google.com/maps/dir/?api=1&destination=28.682389,77.450806" })
    googleMapsLink: string

    @Prop({ default: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3500.222728266453!2d77.45080557550257!3d28.68238887563857!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390cf1a76c8c5c7d%3A0x6d859424c13088b9!2sISKCON%20Ghaziabad!5e0!3m2!1sen!2sin!4v1706013654321!5m2!1sen!2sin" })
    googleMapsEmbedUrl: string

    @Prop({ default: "info@iskconghaziabad.com" })
    email: string

    @Prop({ default: "+91 85889 10062" })
    phone1: string

    @Prop({ default: "+91 81309 92863" })
    phone2: string

    @Prop({ default: "4:30 AM - 1:00 PM" })
    morningTimings: string

    @Prop({ default: "4:30 PM - 8:30 PM" })
    eveningTimings: string

    @Prop({ default: "https://www.facebook.com/share/186TRRnouU/?mibextid=wwXIfr" })
    facebook: string

    @Prop({ default: "https://www.instagram.com/iskconghaziabad?igsh=MXN5Y2VhYzhuOHV1bw%3D%3D&utm_source=qr" })
    instagram: string

    @Prop({ default: "https://youtube.com/@iskconghaziabad?si=Ghu3rYl1qEdCxMrE" })
    youtube: string

    @Prop({ default: "" })
    twitter: string

    @Prop({ default: "https://whatsapp.com/channel/0029VaSENPW9hXF2XPDG5e41" })
    whatsapp: string
}

export const ContactSettingsSchema = SchemaFactory.createForClass(ContactSettings)
