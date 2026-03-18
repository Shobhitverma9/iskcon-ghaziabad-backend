import { Injectable, Logger } from '@nestjs/common';
import * as postmark from 'postmark';

@Injectable()
export class OtpService {
    private readonly logger = new Logger(OtpService.name);
    private client: postmark.ServerClient;

    constructor() {
        // Initialize Postmark client if API key is present
        if (process.env.POSTMARK_API_TOKEN) {
            this.client = new postmark.ServerClient(process.env.POSTMARK_API_TOKEN);
        }
    }

    generateOtp(): string {
        // Generate a 6-digit number
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    async sendOtp(email: string, phone: string, otp: string): Promise<void> {
        this.logger.debug(`[OtpService] Generated OTP for ${email} / ${phone}: ${otp}`);

        // Send via Email
        await this.sendEmailOtp(email, otp);

        // Send via SMS (Mock for now)
        await this.sendSmsOtp(phone, otp);
    }

    private async sendEmailOtp(email: string, otp: string): Promise<void> {
        if (!this.client) {
            this.logger.warn('Postmark API token not found. Skipping email sending.');
            return;
        }

        try {
            await this.client.sendEmail({
                "From": process.env.POSTMARK_FROM_EMAIL || "info@iskconghaziabad.com", // Verified sender signature
                "To": email,
                "Subject": "Your Verification Code - ISKCON Ghaziabad",
                "HtmlBody": `
                    <div style="font-family: sans-serif; padding: 20px;">
                        <h2>Welcome to ISKCON Ghaziabad!</h2>
                        <p>Your verification code is:</p>
                        <h1 style="color: #f97316; letter-spacing: 5px;">${otp}</h1>
                        <p>This code is valid for 10 minutes.</p>
                        <p>If you didn't request this code, please ignore this email.</p>
                    </div>
                `,
                "TextBody": `Your verification code is: ${otp}`
            });
            this.logger.log(`[OtpService] OTP email sent to ${email}`);
        } catch (error) {
            this.logger.error('Failed to send email:', error);
            // Don't throw error to allow flow to continue (checking console for OTP)
        }
    }

    private async sendSmsOtp(phone: string, otp: string): Promise<void> {
        // MOCK SMS Service
        // In production, integrate with Twilio, MSG91, etc.
        this.logger.log(`[OtpService] [MOCK SMS] Sending OTP ${otp} to ${phone}`);
    }
}
