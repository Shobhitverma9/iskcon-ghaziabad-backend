import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { FestivalService } from './festival.service';
import { CreateFestivalDto } from './dto/create-festival.dto';
import { UpdateFestivalDto } from './dto/update-festival.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('festivals')
export class FestivalController {
    constructor(private readonly festivalService: FestivalService) { }

    @Get('active')
    findAllActive() {
        return this.festivalService.findAllActive();
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'volunteer')
    @Post()
    create(@Body() createFestivalDto: CreateFestivalDto) {
        return this.festivalService.create(createFestivalDto);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'volunteer')
    @Get('admin')
    findAllAdmin() {
        return this.festivalService.findAllAdmin();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.festivalService.findOne(id);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'volunteer')
    @Patch(':id')
    update(@Param('id') id: string, @Body() updateFestivalDto: UpdateFestivalDto) {
        return this.festivalService.update(id, updateFestivalDto);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'volunteer')
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.festivalService.remove(id);
    }
}
