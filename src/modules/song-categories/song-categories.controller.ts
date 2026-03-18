import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { SongCategoriesService } from './song-categories.service';
import { CreateSongCategoryDto, UpdateSongCategoryDto } from './dto/create-song-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('song-categories')
export class SongCategoriesController {
    constructor(private readonly categoriesService: SongCategoriesService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    create(@Body() createDto: CreateSongCategoryDto) {
        return this.categoriesService.create(createDto);
    }

    @Get()
    findAll() {
        return this.categoriesService.findAll();
    }

    @Get('admin')
    @UseGuards(JwtAuthGuard)
    findAllAdmin() {
        return this.categoriesService.findAllAdmin();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.categoriesService.findOne(id);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    update(@Param('id') id: string, @Body() updateDto: UpdateSongCategoryDto) {
        return this.categoriesService.update(id, updateDto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    remove(@Param('id') id: string) {
        return this.categoriesService.remove(id);
    }
}
