
import { Controller, Get, Put, Body, UseGuards } from "@nestjs/common"
import { ContactSettingsService } from "./contact-settings.service"
import { UpdateContactSettingsDto } from "./dto/update-contact-settings.dto"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { RolesGuard } from "../auth/guards/roles.guard"
import { Roles } from "../auth/decorators/roles.decorator"

@Controller("contact-settings")
export class ContactSettingsController {
    constructor(private readonly contactSettingsService: ContactSettingsService) { }

    @Get()
    getSettings() {
        return this.contactSettingsService.getSettings()
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles("admin")
    @Put()
    updateSettings(@Body() updateDto: UpdateContactSettingsDto) {
        return this.contactSettingsService.updateSettings(updateDto)
    }
}
