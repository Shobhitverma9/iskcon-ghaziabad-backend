import { Body, Controller, Get, Param, Post, Patch, Delete, UseGuards } from '@nestjs/common';
import { SongsService } from './songs.service';
import { CreateSongDto } from './dto/create-song.dto';
import { UpdateSongDto } from './dto/update-song.dto';
import { Song } from './schemas/song.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('songs')
export class SongsController {
    constructor(private readonly songsService: SongsService) { }

    @Post()
    create(@Body() createSongDto: CreateSongDto): Promise<Song> {
        return this.songsService.create(createSongDto);
    }

    @Get()
    findAll(): Promise<Song[]> {
        return this.songsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string): Promise<Song> {
        return this.songsService.findOne(id);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'volunteer')
    @Patch(':id')
    update(@Param('id') id: string, @Body() updateSongDto: UpdateSongDto): Promise<Song> {
        return this.songsService.update(id, updateSongDto);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'volunteer')
    @Delete(':id')
    remove(@Param('id') id: string): Promise<Song> {
        return this.songsService.remove(id);
    }
}
