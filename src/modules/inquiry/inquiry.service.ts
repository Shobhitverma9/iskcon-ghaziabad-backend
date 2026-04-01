import { Injectable, Logger } from "@nestjs/common"
import { InjectModel } from "@nestjs/mongoose"
import { Model } from "mongoose"
import { Inquiry, InquiryDocument } from "./schemas/inquiry.schema"
import { CreateInquiryDto } from "./dto/create-inquiry.dto"
import { NotificationService } from "../notification/notification.service"
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class InquiryService {
    private readonly logger = new Logger(InquiryService.name);

    constructor(
        @InjectModel(Inquiry.name) private inquiryModel: Model<InquiryDocument>,
        private readonly notificationService: NotificationService,
    ) { }

    async create(createInquiryDto: CreateInquiryDto): Promise<Inquiry> {
        const inquiry = new this.inquiryModel(createInquiryDto)
        const savedInquiry = await inquiry.save()

        // Check if the inquiry is for Bhagavad Gita Download (Support both spellings)
        const isGitaInquiry = createInquiryDto.type && 
            (createInquiryDto.type.toUpperCase().includes('BHAGAVAD GITA') || 
             createInquiryDto.type.toUpperCase().includes('BHAGWAT GITA'));

        if (isGitaInquiry) {
            // Await gita email to catch potential errors if needed, though we catch internally
            await this.sendGitaEmail(createInquiryDto)
        }

        // Notify Admin for all inquiries
        this.sendInquiryNotificationToAdmin(createInquiryDto);

        return savedInquiry
    }

    private async sendInquiryNotificationToAdmin(dto: CreateInquiryDto) {
        try {
            const subject = `New Inquiry Received: ${dto.type} - ${dto.name}`;
            const htmlBody = `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: #8E1B3A; padding: 20px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">New Website Inquiry</h1>
                    </div>
                    <div style="padding: 24px; line-height: 1.6;">
                        <p style="font-size: 16px; margin-bottom: 20px;">A new contact form submission has been received through the website.</p>
                        
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; width: 120px;">Name:</td>
                                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${dto.name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">Email:</td>
                                <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><a href="mailto:${dto.email}">${dto.email}</a></td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">Phone:</td>
                                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${dto.phone || 'Not provided'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">Subject/Type:</td>
                                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${dto.type}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">Message:</td>
                                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${dto.details || 'No message content'}</td>
                            </tr>
                        </table>
                        
                        <div style="margin-top: 30px; padding: 15px; background-color: #f9f9f9; border-radius: 4px; font-size: 14px; text-align: center;">
                            This inquiry has been saved to the Admin Panel. You can manage it from the <strong>Inquiries</strong> section.
                        </div>
                    </div>
                    <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #777;">
                        © ${new Date().getFullYear()} ISKCON Ghaziabad - Sri Sri Radha Madan Mohan Temple
                    </div>
                </div>
            `;

            // Send to the official info email
            await this.notificationService.sendEmail(
                "info@iskconghaziabad.com",
                subject,
                htmlBody
            );
        } catch (error) {
            this.logger.error('Error sending Admin Inquiry notification:', error);
        }
    }

    private async sendGitaEmail(dto: CreateInquiryDto) {
        try {
            // Updated path to look in the backend's own public folder (included in Docker image)
            // Works in dev (backend/public) and prod (/app/public)
            const filePath = path.join(process.cwd(), 'public', 'bhagavad-gita-as-it-is.pdf');
            if (fs.existsSync(filePath)) {
                const fileBuffer = fs.readFileSync(filePath);
                const base64File = fileBuffer.toString('base64');

                const subject = "Your Free Bhagavad Gita As It Is - ISKCON Ghaziabad";
                const htmlBody = `
                    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                        <div style="background-color: #fce7cf; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                            <h1 style="color: #d1440c; margin: 0;">Hare Krishna!</h1>
                        </div>
                        <div style="padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px;">
                            <p>Dear <strong>${dto.name}</strong>,</p>
                            <p>Please accept our humble obeisances. All glories to Srila Prabhupada.</p>
                            <p>Thank you for requesting a copy of the <strong>Bhagavad Gita As It Is</strong>. We are delighted to share this transcendental knowledge with you.</p>
                            <p>Please find attached the PDF version of the Bhagavad Gita. May this divine wisdom guide you on your spiritual journey and bring you closer to Lord Krishna.</p>
                            <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #d1440c; margin: 20px 0; font-style: italic;">
                                "And of all yogīs, the one with great faith who always abides in Me, thinks of Me within himself, and renders transcendental loving service to Me—he is the most intimately united with Me in yoga and is the highest of all. That is My opinion."
                                <br/>- <span style="font-weight: bold;">Bhagavad Gita 6.47</span>
                            </div>
                            <p>If you have any questions or would like to learn more, please feel free to reply to this email or visit our temple.</p>
                            <p>Chant and be happy:</p>
                            <p style="font-weight: bold; color: #d1440c;">Hare Krishna, Hare Krishna, Krishna Krishna, Hare Hare<br>Hare Rama, Hare Rama, Rama Rama, Hare Hare</p>
                            <br>
                            <p>Your servants,<br><strong>ISKCON Ghaziabad Team</strong></p>
                        </div>
                    </div>
                `;

                await this.notificationService.sendEmail(
                    dto.email,
                    subject,
                    htmlBody,
                    undefined,
                    [{
                        Name: "Bhagavad-Gita-As-It-Is.pdf",
                        Content: base64File,
                        ContentType: "application/pdf"
                    }]
                );
            } else {
                this.logger.warn(`Bhagavad Gita PDF not found at: ${filePath}`);
            }
        } catch (error) {
            this.logger.error('Error sending Bhagavad Gita email:', error);
        }
    }

    async findAll(): Promise<Inquiry[]> {
        return this.inquiryModel.find().sort({ createdAt: -1 }).exec()
    }

    async updateStatus(id: string, status: string): Promise<Inquiry | null> {
        return this.inquiryModel.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        ).exec()
    }

    async remove(id: string): Promise<Inquiry | null> {
        return this.inquiryModel.findByIdAndDelete(id).exec()
    }

    async getInquiriesCsv(): Promise<string> {
        const inquiries = await this.inquiryModel.find().sort({ createdAt: -1 }).exec();

        if (inquiries.length === 0) {
            return '';
        }

        const headers = ['Name', 'Email', 'Phone', 'Type', 'Address', 'Details', 'Status', 'Date'];
        const rows = inquiries.map(inquiry => {
            return [
                inquiry.name || '',
                inquiry.email || '',
                inquiry.phone || '',
                inquiry.type || '',
                inquiry.address ? `"${inquiry.address.replace(/"/g, '""')}"` : '',
                inquiry.details ? `"${inquiry.details.replace(/"/g, '""')}"` : '',
                inquiry.status || '',
                inquiry.createdAt ? new Date(inquiry.createdAt).toISOString().split('T')[0] : ''
            ].join(',');
        });

        return [headers.join(','), ...rows].join('\n');
    }
}
