// @ts-nocheck
import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"
import { getModelToken } from "@nestjs/mongoose"
import { ContactSettings } from "./modules/contact-settings/schemas/contact-settings.schema"

async function bootstrap() {
    console.log("Initializing Social Media Links Seeding...");
    const app = await NestFactory.createApplicationContext(AppModule)

    try {
        const contactModel = app.get(getModelToken(ContactSettings.name))

        let settings = await contactModel.findOne()

        const socialLinks = {
            facebook: "https://www.facebook.com/share/186TRRnouU/?mibextid=wwXIfr",
            instagram: "https://www.instagram.com/iskconghaziabad?igsh=MXN5Y2VhYzhuOHV1bw%3D%3D&utm_source=qr",
            youtube: "https://youtube.com/@iskconghaziabad?si=Ghu3rYl1qEdCxMrE",
            whatsapp: "https://whatsapp.com/channel/0029VaSENPW9hXF2XPDG5e41"
        }

        if (settings) {
            console.log("Contact settings exist. Updating social media links...")
            Object.assign(settings, socialLinks)
            await settings.save()
            console.log("Social media links updated successfully.")
        } else {
            console.log("Contact settings do not exist. Creating with default social media links...")
            const newSettings = new contactModel(socialLinks)
            await newSettings.save()
            console.log("Contact settings created successfully.")
        }

    } catch (error) {
        console.error("Seeding Failed:", error)
    } finally {
        await app.close()
    }
}

bootstrap()
