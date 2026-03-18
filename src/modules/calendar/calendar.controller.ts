import { Controller, Get, Post, Query, UseInterceptors, UploadedFile, BadRequestException, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CalendarService } from './calendar.service';
import { CreateCalendarEventDto } from './dto/create-event.dto';
import { UpdateCalendarEventDto } from './dto/update-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('calendar')
export class CalendarController {
    constructor(private readonly calendarService: CalendarService) { }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    async uploadIcs(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }
        // file.buffer is available since we use memory storage by default in NestJS
        return this.calendarService.parseAndSaveIcs(file.buffer);
    }

    @Post('upload-image')
    @UseInterceptors(FileInterceptor('file'))
    async uploadImage(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }
        const url = await this.calendarService.processAndUploadImage(file);
        return { url };
    }

    @Get()
    async getEvents(
        @Query('month') month?: string,
        @Query('year') year?: string,
    ) {
        const m = month ? parseInt(month, 10) : undefined;
        const y = year ? parseInt(year, 10) : undefined;
        return this.calendarService.findAll(m, y);
    }

    @Get('upcoming')
    async getUpcomingEvents(@Query('limit') limit?: string) {
        const l = limit ? parseInt(limit, 10) : 6;
        return this.calendarService.findUpcoming(l);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'volunteer')
    @Post()
    async create(@Body() createEventDto: CreateCalendarEventDto) {
        return this.calendarService.create(createEventDto);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'volunteer')
    @Patch(':id')
    async update(@Param('id') id: string, @Body() updateEventDto: UpdateCalendarEventDto) {
        return this.calendarService.update(id, updateEventDto);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'volunteer')
    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.calendarService.remove(id);
    }
}
