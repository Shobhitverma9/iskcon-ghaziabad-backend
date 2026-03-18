import { Controller, Get, Post, Body, Delete, Param } from '@nestjs/common';
import { InstagramReelsService } from './instagram-reels.service';
import { InstagramReel } from './instagram-reels.schema';

@Controller('instagram-reels')
export class InstagramReelsController {
    constructor(private readonly instagramReelsService: InstagramReelsService) { }

    @Get()
    async findAll(): Promise<InstagramReel[]> {
        return this.instagramReelsService.findAll();
    }

    @Post()
    async create(@Body() createInstagramReelDto: any): Promise<InstagramReel> {
        // Basic create for seeding/admin purposes. 
        // In a real scenario, this would have a DTO validation.
        return this.instagramReelsService.create(createInstagramReelDto);
    }

    @Post('process')
    async processReel(@Body('url') url: string) {
        if (!url) {
            throw new Error('URL is required');
        }
        return this.instagramReelsService.processReel(url);
    }

    @Delete(':id')
    async delete(@Param('id') id: string) {
        return this.instagramReelsService.delete(id);
    }
}
