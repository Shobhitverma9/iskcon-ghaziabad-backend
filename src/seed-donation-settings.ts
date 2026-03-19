// @ts-nocheck
import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"
import { getModelToken } from "@nestjs/mongoose"
import { DonationSettings } from "./modules/donation/schemas/donation-settings.schema"

async function bootstrap() {
    console.log("Initializing Donation Settings Seeding...");
    const app = await NestFactory.createApplicationContext(AppModule)

    try {
        const settingsModel = app.get(getModelToken(DonationSettings.name))

        const existingSettings = await settingsModel.findOne()

        if (existingSettings) {
            console.log("Donation settings already exist. Skipping...")
        } else {
            console.log("Creating default donation settings...")
            const defaultSettings = new settingsModel({
                bankName: 'ICICI BANK',
                accountName: 'ISKCON',
                accountNumber: '628601046447',
                ifscCode: 'ICIC0006286',
                upiId: 'iskconrajnagar@icici',
                qrCodeUrl: '/qrdonate.webp'
            })

            await defaultSettings.save()
            console.log("Donation settings created successfully.")
        }

    } catch (error) {
        console.error("Seeding Failed:", error)
    } finally {
        await app.close()
    }
}

bootstrap()
