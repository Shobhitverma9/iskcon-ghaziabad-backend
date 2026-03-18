
import { Injectable } from "@nestjs/common"
import { InjectModel } from "@nestjs/mongoose"
import { Model } from "mongoose"
import { ContactSettings, ContactSettingsDocument } from "./schemas/contact-settings.schema"
import { UpdateContactSettingsDto } from "./dto/update-contact-settings.dto"

@Injectable()
export class ContactSettingsService {
    constructor(
        @InjectModel(ContactSettings.name) private contactSettingsModel: Model<ContactSettingsDocument>,
    ) { }

    async getSettings(): Promise<ContactSettings> {
        let settings = await this.contactSettingsModel.findOne().exec()

        if (!settings) {
            // Create default settings if none exist
            settings = await this.contactSettingsModel.create({})
        }

        return settings
    }

    async updateSettings(updateDto: UpdateContactSettingsDto): Promise<ContactSettings> {
        let settings = await this.contactSettingsModel.findOne().exec()

        if (!settings) {
            settings = await this.contactSettingsModel.create(updateDto)
        } else {
            Object.assign(settings, updateDto)
            await settings.save()
        }

        return settings
    }
}
