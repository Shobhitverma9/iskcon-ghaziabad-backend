import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DonationSettings, DonationSettingsDocument } from './schemas/donation-settings.schema';

@Injectable()
export class DonationSettingsService {
    constructor(
        @InjectModel(DonationSettings.name)
        private donationSettingsModel: Model<DonationSettingsDocument>,
    ) { }

    async getSettings(): Promise<DonationSettings> {
        const settings = await this.donationSettingsModel.findOne().exec();
        if (!settings) {
            // Return default settings if none found in DB
            return new this.donationSettingsModel().toJSON();
        }
        return settings;
    }

    async updateSettings(updateData: Partial<DonationSettings>): Promise<DonationSettings> {
        let settings = await this.donationSettingsModel.findOne().exec();

        if (!settings) {
            settings = new this.donationSettingsModel(updateData);
        } else {
            Object.assign(settings, updateData);
        }

        return settings.save();
    }
}
