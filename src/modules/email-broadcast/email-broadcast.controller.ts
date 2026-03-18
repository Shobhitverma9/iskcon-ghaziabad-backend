import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { EmailBroadcastService } from './email-broadcast.service';
import { CreateEmailTemplateDto, UpdateEmailTemplateDto } from './dto/template.dto';
import { SendBroadcastDto } from './dto/broadcast.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('email-broadcast')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class EmailBroadcastController {
  constructor(private readonly emailBroadcastService: EmailBroadcastService) {}

  @Post('templates')
  createTemplate(@Body() dto: CreateEmailTemplateDto) {
    return this.emailBroadcastService.createTemplate(dto);
  }

  @Get('templates')
  findAllTemplates() {
    return this.emailBroadcastService.findAllTemplates();
  }

  @Get('templates/:id')
  findTemplateById(@Param('id') id: string) {
    return this.emailBroadcastService.findTemplateById(id);
  }

  @Put('templates/:id')
  updateTemplate(@Param('id') id: string, @Body() dto: UpdateEmailTemplateDto) {
    return this.emailBroadcastService.updateTemplate(id, dto);
  }

  @Delete('templates/:id')
  deleteTemplate(@Param('id') id: string) {
    return this.emailBroadcastService.deleteTemplate(id);
  }

  @Post('send')
  sendBroadcast(@Body() dto: SendBroadcastDto) {
    return this.emailBroadcastService.sendBroadcast(dto);
  }

  @Get('history')
  findAllBroadcasts() {
    return this.emailBroadcastService.findAllBroadcasts();
  }
}
