
import { Module } from "@nestjs/common"
import { MongooseModule } from "@nestjs/mongoose"
import { ContactSettingsController } from "./contact-settings.controller"
import { ContactSettingsService } from "./contact-settings.service"
import { ContactSettings, ContactSettingsSchema } from "./schemas/contact-settings.schema"

@Module({
    imports: [
        MongooseModule.forFeature([{ name: ContactSettings.name, schema: ContactSettingsSchema }]),
    ],
    controllers: [ContactSettingsController],
    providers: [ContactSettingsService],
    exports: [ContactSettingsService],
})
export class ContactSettingsModule { }
