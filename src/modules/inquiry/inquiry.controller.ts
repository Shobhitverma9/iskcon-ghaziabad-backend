import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Res } from "@nestjs/common"
import { Response } from 'express';
import { InquiryService } from "./inquiry.service"
import { CreateInquiryDto } from "./dto/create-inquiry.dto"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { RolesGuard } from "../auth/guards/roles.guard"
import { Roles } from "../auth/decorators/roles.decorator"

@Controller("inquiries")
export class InquiryController {
    constructor(private readonly inquiryService: InquiryService) { }

    @Post()
    create(@Body() createInquiryDto: CreateInquiryDto) {
        return this.inquiryService.create(createInquiryDto)
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'volunteer')
    @Get()
    findAll() {
        return this.inquiryService.findAll()
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'volunteer')
    @Patch(":id/status")
    updateStatus(@Param("id") id: string, @Body("status") status: string) {
        return this.inquiryService.updateStatus(id, status)
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'volunteer')
    @Get('export/csv')
    async exportCsv(@Res() res: Response) {
        const csv = await this.inquiryService.getInquiriesCsv();

        res.header('Content-Type', 'text/csv');
        res.header('Content-Disposition', 'attachment; filename=inquiries.csv');
        return res.send(csv);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    @Delete(":id")
    remove(@Param("id") id: string) {
        return this.inquiryService.remove(id)
    }
}
