import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EmailTemplate, EmailTemplateDocument } from '../notification/schemas/email-template.schema';
import { EmailBroadcast, EmailBroadcastDocument } from '../notification/schemas/email-broadcast.schema';
import { CreateEmailTemplateDto, UpdateEmailTemplateDto } from './dto/template.dto';
import { SendBroadcastDto } from './dto/broadcast.dto';
import { NotificationService } from '../notification/notification.service';
import { User, UserDocument } from '../auth/schemas/user.schema';

@Injectable()
export class EmailBroadcastService {
  private readonly logger = new Logger(EmailBroadcastService.name);

  constructor(
    @InjectModel(EmailTemplate.name) private templateModel: Model<EmailTemplateDocument>,
    @InjectModel(EmailBroadcast.name) private broadcastModel: Model<EmailBroadcastDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private notificationService: NotificationService,
  ) {}

  // Template CRUD
  async createTemplate(dto: CreateEmailTemplateDto): Promise<EmailTemplate> {
    const template = new this.templateModel(dto);
    return template.save();
  }

  async findAllTemplates(): Promise<EmailTemplate[]> {
    return this.templateModel.find().sort({ createdAt: -1 }).exec();
  }

  async findTemplateById(id: string): Promise<EmailTemplate> {
    const template = await this.templateModel.findById(id).exec();
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async updateTemplate(id: string, dto: UpdateEmailTemplateDto): Promise<EmailTemplate> {
    const template = await this.templateModel.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async deleteTemplate(id: string): Promise<void> {
    const result = await this.templateModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('Template not found');
  }

  // Broadcasting
  async sendBroadcast(dto: SendBroadcastDto): Promise<EmailBroadcast> {
    const template = await this.findTemplateById(dto.templateId);
    let recipientEmails: string[] = [];

    if (dto.recipientType === 'all') {
      const users = await this.userModel.find({}, 'email').exec();
      recipientEmails = users.map(u => u.email).filter(e => !!e);
    } else {
      recipientEmails = dto.recipients || [];
    }

    const broadcast = new this.broadcastModel({
      templateId: template['_id'],
      recipients: recipientEmails,
      status: 'pending',
    });
    await broadcast.save();

    // Start broadcasting in background (or sequentially for now, depending on volume)
    this.processBroadcast(broadcast['_id'].toString(), template, recipientEmails);

    return broadcast;
  }

  private async processBroadcast(broadcastId: string, template: EmailTemplate, recipients: string[]) {
    let successCount = 0;
    let failureCount = 0;

    const chunkSize = 500;
    const taskChunks: string[][] = [];
    for (let i = 0; i < recipients.length; i += chunkSize) {
      taskChunks.push(recipients.slice(i, i + chunkSize));
    }

    const limit = 5;
    let chunkIndex = 0;

    const runWorker = async () => {
      while (chunkIndex < taskChunks.length) {
        const i = chunkIndex++;
        const chunk = taskChunks[i];
        try {
          await this.notificationService.sendBroadcastBatch(chunk, template.subject, template.htmlBody);
          successCount += chunk.length;
        } catch (error) {
          this.logger.error(`Failed to send broadcast batch at chunk ${i}`, error);
          failureCount += chunk.length;
        }
      }
    };

    // Start workers
    const workers = Array.from({ length: Math.min(limit, taskChunks.length) }, () => runWorker());
    await Promise.all(workers);

    await this.broadcastModel.findByIdAndUpdate(broadcastId, {
      status: failureCount === recipients.length ? 'failed' : 'sent',
      sentAt: new Date(),
      successCount,
      failureCount,
    });
  }

  async findAllBroadcasts(): Promise<EmailBroadcast[]> {
    return this.broadcastModel.find().populate('templateId').sort({ createdAt: -1 }).exec();
  }
}
