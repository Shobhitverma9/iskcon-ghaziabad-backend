import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, UploadedFile, BadRequestException, Req, Logger } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BannersService } from './banners.service';
import { Banner } from './schemas/banner.schema';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { StorageService } from '../../shared/storage/storage.service';
import { ImageProcessingService } from '../../shared/image/image-processing.service';

@Controller('banners')
export class BannersController {
    private readonly logger = new Logger(BannersController.name);

    constructor(
        private readonly bannersService: BannersService,
        private readonly storageService: StorageService,
        private readonly imageProcessingService: ImageProcessingService,
    ) { }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    async uploadImage(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
        this.logger.debug('--------------------------------------------------');
        this.logger.debug('Banner Upload Endpoint Hit');
        this.logger.debug(`Headers: ${JSON.stringify(req.headers)}`);
        this.logger.debug(`Content-Type: ${req.headers['content-type']}`);
        this.logger.debug(`File: ${file ? 'Present' : 'Missing'}`);
        if (file) this.logger.debug(`File Details: ${file.originalname} ${file.mimetype} ${file.size}`);
        this.logger.debug('--------------------------------------------------');

        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        try {
            // Process image (resize to max 1920x1080, convert to webp)
            const processedBuffer = await this.imageProcessingService.processImage(file.buffer);

            // Create specific filename
            const filename = `banners/${Date.now()}-${Math.round(Math.random() * 1E9)}.webp`;

            // Upload to storage
            const url = await this.storageService.uploadFile(processedBuffer, filename, 'image/webp');

            this.logger.log(`Banner Upload Success: ${url}`);
            return { url };
        } catch (error) {
            this.logger.error('Banner Upload Error:', error);
            throw error;
        }
    }

    @Get()
    async findAll(): Promise<Banner[]> {
        return this.bannersService.findAll();
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.bannersService.findOne(id);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    @Post()
    async create(@Body() createBannerDto: CreateBannerDto) {
        return this.bannersService.create(createBannerDto);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    @Patch(':id')
    async update(@Param('id') id: string, @Body() updateBannerDto: UpdateBannerDto) {
        return this.bannersService.update(id, updateBannerDto);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.bannersService.remove(id);
    }
}
