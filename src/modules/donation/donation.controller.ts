import { Controller, Post, Get, Param, Body, UseGuards, Req, Patch, Delete, UseInterceptors, UploadedFile, BadRequestException, Query, Logger } from "@nestjs/common"
import { FileInterceptor } from "@nestjs/platform-express"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { RolesGuard } from "../auth/guards/roles.guard"
import { Roles } from "../auth/decorators/roles.decorator"
import { DonationService } from "./donation.service"
import { ImageProcessingService } from "../../shared/image/image-processing.service"
import { StorageService } from "../../shared/storage/storage.service"
import { CreateDonationDto } from "./dto/create-donation.dto"
import { CreateCategoryDto } from "./dto/create-category.dto"
import { CreateItemDto } from "./dto/create-item.dto"

@Controller("donations")
export class DonationController {
  private readonly logger = new Logger(DonationController.name);

  constructor(
    private readonly donationService: DonationService,
    private readonly imageProcessingService: ImageProcessingService,
    private readonly storageService: StorageService,
  ) { }

  // Upload
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'volunteer')
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Process image (resize to max 1080p, convert to webp)
    const processedBuffer = await this.imageProcessingService.processImage(file.buffer);

    // Create specific filename
    const filename = `donations/${Date.now()}-${Math.round(Math.random() * 1E9)}.webp`;

    // Upload to storage
    const url = await this.storageService.uploadFile(processedBuffer, filename, 'image/webp');

    return { url };
  }

  // Categories
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'volunteer')
  @Post("categories")
  async createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    return this.donationService.createCategory(createCategoryDto)
  }

  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('admin', 'volunteer')
  @Patch("categories/:id")
  async updateCategory(@Param('id') id: string, @Body() body: any) {
    return this.donationService.updateCategory(id, body)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'volunteer')
  @Delete("categories/:id")
  async deleteCategory(@Param('id') id: string) {
    return this.donationService.deleteCategory(id)
  }

  @Get("categories")
  async getCategories(@Query('all') all?: string) {
    const filter = all === 'true' ? {} : { isActive: true };
    return this.donationService.getCategories(filter)
  }

  // Items
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'volunteer')
  @Post("items")
  async createItem(@Body() createItemDto: CreateItemDto) {
    return this.donationService.createItem(createItemDto)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'volunteer')
  @Patch("items/:id")
  async updateItem(@Param('id') id: string, @Body() body: any) {
    return this.donationService.updateItem(id, body)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'volunteer')
  @Delete("items/:id")
  async deleteItem(@Param('id') id: string) {
    return this.donationService.deleteItem(id)
  }

  @Get("options")
  async getDonationOptions(@Query('all') all?: string) {
    const filterActive = all !== 'true';
    return this.donationService.getDonationOptions(filterActive)
  }

  @Get("stats/overview")
  async getStats() {
    return this.donationService.getStats()
  }

  // Analytics - Specific routes first
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'volunteer')
  @Get("analytics/donors")
  async getDonorAnalytics(@Query('period') period?: string) {
    return this.donationService.getDonorAnalytics(period)
  }

  @Get('recent/:limit')
  async getRecent(@Param('limit') limit: number = 10) {
    return this.donationService.getRecent(limit);
  }

  @Get('top-donors/:limit')
  async getTopDonors(@Param('limit') limit: number = 20) {
    return this.donationService.getTopDonors(limit);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'volunteer')
  @Get('analytics')
  async getAnalytics() {
    return this.donationService.getAnalytics();
  }

  @Post()
  async create(@Body() createDonationDto: CreateDonationDto, @Req() req) {
    // Extract IP address from request (handling proxies)
    const ipAddress = (req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress) as string;
    return this.donationService.create(createDonationDto, ipAddress)
  }

  @Post('abandoned')
  @Post('abandoned')
  async abandoned(@Body() body: any) {
    return this.donationService.handleAbandonedCheckout(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'accounts')
  @Post('manual')
  async createManual(@Body() createDonationDto: CreateDonationDto, @Req() req) {
    return this.donationService.createManual(createDonationDto, req.user.userId);
  }





  @UseGuards(JwtAuthGuard)
  @Get('my/donations')
  async getMyDonations(@Req() req) {
    return this.donationService.findByUser(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my/certificates')
  async getMyCertificates(@Req() req) {
    return this.donationService.getCertificates(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my/subscriptions')
  async getMySubscriptions(@Req() req) {
    return this.donationService.getSubscriptions(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('subscriptions/:id/cancel')
  async cancelSubscription(@Param('id') id: string, @Req() req) {
    return this.donationService.cancelSubscription(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'accounts')
  @Get('all')
  async findAll(@Query('period') period?: string) {
    return this.donationService.findAll(period);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.donationService.findById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'volunteer', 'accounts')
  @Get('admin/failed-check')
  async getFailedCheck() {
    return this.donationService.getFailedDonationsWithCheck();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'volunteer', 'accounts')
  @Get('whatsapp/numbers')
  async getWhatsappNumbers(@Query('status') status?: string) {
    const filter = status ? { status } : {};
    const numbers = await this.donationService.getUniqueDonorPhoneNumbers(filter);
    return { success: true, count: numbers.length, numbers };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'marketing', 'accounts')
  @Post('whatsapp/promote')
  async sendPromotionalWhatsapp(@Body() body: { numbers?: string[], status?: string, message: string }) {
    if (!body.message) {
      throw new BadRequestException('Message is required');
    }

    let numbers = body.numbers;

    // If no numbers provided but status is, fetch from DB
    if (!numbers || numbers.length === 0) {
      const filter = body.status ? { status: body.status } : {};
      numbers = await this.donationService.getUniqueDonorPhoneNumbers(filter);
    }

    if (!numbers || numbers.length === 0) {
      throw new BadRequestException('No valid recipients found');
    }

    // Trigger bulk sending in background (don't await fully to avoid timeout)
    this.donationService.sendBulkWhatsapp(numbers, body.message).catch(err =>
      this.logger.error('Bulk WhatsApp background task failed', err)
    );

    return {
      success: true,
      message: 'Bulk WhatsApp sending started in background',
      recipientCount: numbers.length
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'volunteer', 'accounts')
  @Post(':id/resend-receipt')
  async resendReceipt(@Param('id') id: string) {
    await this.donationService.resendReceipt(id);
    return { success: true, message: 'Receipt resend triggered' };
  }
}
