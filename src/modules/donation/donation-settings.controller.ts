import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { DonationSettingsService } from './donation-settings.service';
import { DonationSettings } from './schemas/donation-settings.schema';

@Controller('donations/settings')
export class DonationSettingsController {
    constructor(private readonly donationSettingsService: DonationSettingsService) { }

    @Get()
    async getSettings() {
        return this.donationSettingsService.getSettings();
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    @Patch()
    async updateSettings(@Body() updateData: Partial<DonationSettings>) {
        return this.donationSettingsService.updateSettings(updateData);
    }
}
