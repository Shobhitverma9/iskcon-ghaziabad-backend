import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as postmark from 'postmark';
import axios from 'axios';

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);
    private postmarkClient: postmark.ServerClient;
    private readonly timespanelApiKey: string;
    private readonly timespanelBaseUrl: string;

    constructor(private configService: ConfigService) {
        const token = this.configService.get<string>('POSTMARK_API_TOKEN');
        if (token) {
            this.postmarkClient = new postmark.ServerClient(token);
            this.logger.log('✅ Postmark client initialized successfully');
        } else {
            this.logger.error('❌ POSTMARK_API_TOKEN not found in configuration. Email sending will fail.');
        }

        this.timespanelApiKey = this.configService.get<string>('TIMESPANEL_API_KEY');
        this.timespanelBaseUrl = this.configService.get<string>('TIMESPANEL_BASE_URL') || 'https://api.timespanel.com/v1/send';

        if (!this.timespanelApiKey) {
            this.logger.warn('⚠️ TIMESPANEL_API_KEY not found. WhatsApp notifications will be mocked.');
        }
    }

    async sendEmail(to: string, subject: string, htmlBody: string, textBody?: string, attachments?: any[]): Promise<void> {
        if (!this.postmarkClient) {
            this.logger.error('Postmark API token not found. Cannot send email.');
            throw new Error('Postmark API token not configured');
        }

        try {
            await this.postmarkClient.sendEmail({
                "From": "info@iskconghaziabad.com", // Ensure this sender is verified in Postmark
                "To": to,
                "Subject": subject,
                "HtmlBody": htmlBody,
                "TextBody": textBody || "Please view this email in an HTML-compatible email client.",
                "Attachments": attachments
            });
            this.logger.log(`Email sent to ${to}`);
        } catch (error) {
            this.logger.error(`Failed to send email to ${to}`, error);
            throw error;
        }
    }

    async sendWhatsapp(to: string, message: string, mediaUrl?: string): Promise<void> {
        if (!this.timespanelApiKey) {
            this.logger.log(`[MOCK] Sending WhatsApp to ${to}: ${message} ${mediaUrl ? `With media: ${mediaUrl}` : ''}`);
            return;
        }

        try {
            let cleanPhone = to.replace(/\D/g, ''); // Remove all non-numeric characters like +, spaces, etc.
            if (cleanPhone.length === 10) {
                cleanPhone = `91${cleanPhone}`; // Auto-prefix India country code for 10-digit numbers
            }

            // New structure verified with asyncmsg host
            const payload = {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: cleanPhone,
                type: mediaUrl ? 'image' : 'text',
                ...(mediaUrl ? {
                    image: {
                        link: mediaUrl,
                        caption: message
                    }
                } : {
                    text: {
                        preview_url: false,
                        body: message
                    }
                })
            };

            this.logger.log(`Sending WhatsApp payload: ${JSON.stringify(payload, null, 2)}`);

            const response = await axios.post(this.timespanelBaseUrl, payload, {
                headers: {
                    'Authorization': this.timespanelApiKey,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data && (response.data.status === 'success' || response.data.success)) {
                this.logger.log(`WhatsApp sent successfully to ${to}`);
            } else {
                this.logger.error(`WhatsApp API error for ${to}: ${JSON.stringify(response.data)}`);
            }
        } catch (error) {
            this.logger.error(`Failed to send WhatsApp to ${to}`, error.response?.data || error.message);
        }
    }

    async sendWhatsappReceipt(
        to: string,
        receiptUrl: string,
        donorName: string,
        amount: number,
        category: string
    ): Promise<void> {
        if (!this.timespanelApiKey) {
            this.logger.log(`[MOCK] Sending WhatsApp Receipt to ${to}: ${receiptUrl}`);
            return;
        }

        try {
            const messageId = `MSG-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

            // Extract first name
            const firstName = donorName.split(' ')[0] || donorName;

            let cleanPhone = to.replace(/\D/g, ''); // Remove all non-numeric characters like +, spaces, etc.
            if (cleanPhone.length === 10) {
                cleanPhone = `91${cleanPhone}`; // Auto-prefix India country code for 10-digit numbers
            }

            const payload = {
                messaging_product: "whatsapp",
                message_id: messageId,
                recipient_type: "individual",
                to: cleanPhone,
                type: "template",
                template: {
                    name: "receiptv4",
                    language: {
                        code: "en"
                    },
                    components: [
                        {
                            type: "body",
                            parameters: [
                                { type: "text", text: firstName },
                                { type: "text", text: `${amount} Rs` },
                                { type: "text", text: category || "Donation" },
                                { type: "text", text: firstName },
                                { type: "text", text: category || "Donation" },
                                { type: "text", text: `${amount} Rs` }
                            ]
                        },
                        {
                            type: "header",
                            parameters: [
                                {
                                    type: "document",
                                    document: {
                                        link: receiptUrl,
                                        filename: "receipt"
                                    }
                                }
                            ]
                        }
                    ]
                }
            };

            this.logger.log(`Sending WhatsApp Receipt payload: ${JSON.stringify(payload, null, 2)}`);

            const response = await axios.post(this.timespanelBaseUrl, payload, {
                headers: {
                    'Authorization': this.timespanelApiKey,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data && (response.data.status === 'success' || response.data.success)) {
                this.logger.log(`WhatsApp receipt template (receiptv4) sent successfully to ${to}`);
            } else {
                this.logger.error(`WhatsApp template API error for ${to}: ${JSON.stringify(response.data)}`);
            }
        } catch (error) {
            this.logger.error(`Failed to send WhatsApp receipt template to ${to}`, error.response?.data || error.message);
        }
    }

    async sendCancellationEmail(
        to: string,
        donorName: string,
        amount: number,
        category: string,
        donationPageUrl: string
    ): Promise<void> {
        const subject = 'Hare Krishna! Need help with your donation?';
        const htmlBody = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; line-height: 1.6;">
            <div style="background-color: #fce7cf; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; border: 1px solid #ddd; border-bottom: none;">
                <h1 style="color: #d1440c; margin: 0; font-size: 28px;">Hare Krishna!</h1>
                <p style="color: #8E1B3A; font-weight: bold; margin-top: 10px; font-size: 18px;">ISKCON Ghaziabad</p>
            </div>
            <div style="padding: 30px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 12px 12px; background-color: #ffffff;">
                <p>Dear <strong>${donorName || 'Devotee'}</strong>,</p>
                <p>Please accept our humble obeisances. All glories to Srila Prabhupada.</p>
                <p>We noticed that your donation of <strong>₹${amount}</strong> for <strong>${category || 'ISKCON Ghaziabad'}</strong> could not be completed. If any amount was deducted, it will be automatically refunded within 5-7 business days.</p>
                <div style="background-color: #f9f9f9; padding: 20px; border-left: 4px solid #d1440c; margin: 25px 0;">
                    <p style="margin: 0; font-style: italic; color: #555;">
                        "If one offers Me with love and devotion a leaf, a flower, fruit or water, I will accept it."
                        <br/>— <strong>Bhagavad Gita 9.26</strong>
                    </p>
                </div>
                <p>Your intention to serve Their Lordships is deeply appreciated. Please try again at your convenience:</p>
                <div style="text-align: center; margin: 35px 0;">
                    <a href="${donationPageUrl}"
                       style="background-color: #8E1B3A; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        Try Again 🙏
                    </a>
                </div>
                <p>If you faced any issues, please reply to this email and we will assist you.</p>
                <p>Chant and be happy:</p>
                <p style="font-weight: bold; color: #d1440c; background-color: #fff9f2; padding: 15px; border-radius: 8px; text-align: center;">
                    Hare Krishna, Hare Krishna, Krishna Krishna, Hare Hare<br>
                    Hare Rama, Hare Rama, Rama Rama, Hare Hare
                </p>
                <br>
                <p style="margin-bottom: 0;">Your servants,<br><strong>ISKCON Ghaziabad Team</strong></p>
            </div>
            <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
                <p>© ${new Date().getFullYear()} ISKCON Ghaziabad. All rights reserved.</p>
            </div>
        </div>`;

        await this.sendEmail(to, subject, htmlBody).catch(err =>
            this.logger.error(`Failed to send cancellation email to ${to}`, err)
        );
    }

    async sendWhatsappCancelledPayment(
        to: string,
        donorName: string,
        amount: number,
        category: string,
        donationPageUrl: string
    ): Promise<void> {
        if (!this.timespanelApiKey) {
            this.logger.log(`[MOCK] Sending WhatsApp Cancelled Payment to ${to}`);
            return;
        }

        try {
            const payload = {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: to.replace('+', '').replace(/\s/g, ''),
                type: "template",
                template: {
                    name: "cancelled_payment",
                    language: {
                        code: "en"
                    },
                    components: [
                        {
                            type: "body",
                            parameters: [
                                { type: "text", text: donorName },
                                { type: "text", text: `${amount} rs` },
                                { type: "text", text: category || "Donation" },
                                { type: "text", text: donationPageUrl },
                                { type: "text", text: donorName },
                                { type: "text", text: category || "Donation" },
                                { type: "text", text: `${amount} rs` },
                                { type: "text", text: donationPageUrl }
                            ]
                        }
                    ]
                }
            };

            this.logger.log(`Sending WhatsApp Cancelled Payment payload: ${JSON.stringify(payload, null, 2)}`);

            const response = await axios.post(this.timespanelBaseUrl, payload, {
                headers: {
                    'Authorization': this.timespanelApiKey,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data && (response.data.status === 'success' || response.data.success)) {
                this.logger.log(`WhatsApp cancelled_payment template sent successfully to ${to}`);
            } else {
                this.logger.error(`WhatsApp cancelled_payment API error for ${to}: ${JSON.stringify(response.data)}`);
            }
        } catch (error) {
            this.logger.error(`Failed to send WhatsApp cancelled payment to ${to}`, error.response?.data || error.message);
        }
    }

    async sendSms(to: string, message: string): Promise<void> {
        if (!this.timespanelApiKey) {
            this.logger.log(`[MOCK] Sending SMS to ${to}: ${message}`);
            return;
        }

        try {
            await axios.get(this.timespanelBaseUrl, {
                params: {
                    apikey: this.timespanelApiKey,
                    mobile: to.replace('+', ''),
                    message: message,
                    type: 'sms'
                }
            });
            this.logger.log(`SMS sent successfully to ${to}`);
        } catch (error) {
            this.logger.error(`Failed to send SMS to ${to}`, error);
        }
    }
}
