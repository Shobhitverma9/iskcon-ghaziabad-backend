import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { YatraService } from './yatra.service';
import { CreateYatraBookingDto, VerifyYatraPaymentDto } from './dto/yatra.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('yatra')
export class YatraController {
  constructor(private readonly yatraService: YatraService) {}

  @Post('book')
  async createBooking(@Body() dto: CreateYatraBookingDto) {
    return this.yatraService.createBooking(dto);
  }

  @Post('verify')
  async verifyPayment(@Body() dto: VerifyYatraPaymentDto) {
    return this.yatraService.verifyPayment(dto);
  }

  @Get('bookings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  async findAll() {
    return this.yatraService.findAll();
  }

  @Get('bookings/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  async findOne(@Param('id') id: string) {
    return this.yatraService.findById(id);
  }
}
