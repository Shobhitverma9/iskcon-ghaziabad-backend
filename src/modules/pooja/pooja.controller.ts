import { Controller, Post, Get, Param, Query, Body, Put, Delete, UseGuards, Req, Patch, UseInterceptors, UploadedFile, BadRequestException, Logger } from "@nestjs/common"
import { FileInterceptor } from "@nestjs/platform-express"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { RolesGuard } from "../auth/guards/roles.guard"
import { Roles } from "../auth/decorators/roles.decorator"
import { PoojaService } from "./pooja.service"
import { ImageProcessingService } from "../../shared/image/image-processing.service"
import { StorageService } from "../../shared/storage/storage.service"

@Controller("pooja")
export class PoojaController {
  private readonly logger = new Logger(PoojaController.name);

  constructor(
    private readonly poojaService: PoojaService,
    private readonly imageProcessingService: ImageProcessingService,
    private readonly storageService: StorageService
  ) { }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File, @Req() req) {
    this.logger.debug('--------------------------------------------------');
    this.logger.debug('Pooja Upload Endpoint Hit');
    this.logger.debug(`Headers: ${JSON.stringify(req.headers)}`);
    this.logger.debug(`Content-Type: ${req.headers['content-type']}`);
    this.logger.debug(`File: ${file ? 'Present' : 'Missing'}`);
    if (file) this.logger.debug(`File Details: ${file.originalname} ${file.mimetype} ${file.size}`);
    this.logger.debug('--------------------------------------------------');
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Process image (resize to max 1080p, convert to webp)
    const processedBuffer = await this.imageProcessingService.processImage(file.buffer);

    // Create specific filename
    const filename = `pooja/${Date.now()}-${Math.round(Math.random() * 1E9)}.webp`;

    // Upload to storage
    const url = await this.storageService.uploadFile(processedBuffer, filename, 'image/webp');

    return { url };
  }

  @Post("bookings")
  async createBooking(@Body() createPoojaDto: any) {
    return this.poojaService.create(createPoojaDto)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/bookings')
  async getAllBookings() {
    return this.poojaService.findAll();
  }

  @Get('bookings/:id')
  async getBooking(@Param('id') id: string) {
    return this.poojaService.findById(id);
  }

  @Get('available-slots')
  async getAvailableSlots(@Query('date') date: string) {
    return this.poojaService.getAvailableSlots(new Date(date));
  }

  // Puja Item Endpoints

  @Post('items')
  async createItem(@Body() itemData: any) {
    return this.poojaService.createItem(itemData);
  }

  @Get('items')
  async getAllItems(@Query('all') all?: string) {
    const filter = all === 'true' ? {} : { isActive: true };
    return this.poojaService.findAllItems(filter);
  }

  @Put('items/:id')
  async updateItem(@Param('id') id: string, @Body() itemData: any) {
    return this.poojaService.updateItem(id, itemData);
  }

  @Delete('items/:id')
  async deleteItem(@Param('id') id: string) {
    return this.poojaService.deleteItem(id);
  }


  @UseGuards(JwtAuthGuard)
  @Get('my/bookings')
  async getMyBookings(@Req() req) {
    return this.poojaService.findByUser(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('bookings/:id/reschedule')
  async reschedule(@Param('id') id: string, @Body('date') date: string, @Req() req) {
    return this.poojaService.reschedule(id, new Date(date), req.user.userId);
  }
}
