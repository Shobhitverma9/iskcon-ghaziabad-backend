import { Controller, Get, Post, Body, Delete, Param, UseGuards } from '@nestjs/common';
import { ExternalLinkService } from './external-link.service';
import { CreateExternalLinkDto } from './dto/create-external-link.dto';
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { RolesGuard } from "../auth/guards/roles.guard"
import { Roles } from "../auth/decorators/roles.decorator"

@Controller('external-link')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class ExternalLinkController {
    constructor(private readonly externalLinkService: ExternalLinkService) { }

    @Post()
    create(@Body() createDto: CreateExternalLinkDto) {
        return this.externalLinkService.create(createDto);
    }

    @Get()
    findAll() {
        return this.externalLinkService.findAll();
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.externalLinkService.delete(id);
    }
}
