import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class AnalyticsService {
    private readonly logger = new Logger(AnalyticsService.name);
    private readonly pixelId: string;
    private readonly accessToken: string;
    private readonly isEnabled: boolean;

    constructor(private readonly configService: ConfigService) {
        this.pixelId = this.configService.get<string>('META_PIXEL_ID') || '683689696549944'; // Use the provided Pixel ID as fallback
        this.accessToken = this.configService.get<string>('META_CAPI_ACCESS_TOKEN') || '';

        this.isEnabled = !!(this.pixelId && this.accessToken);
        if (!this.isEnabled) {
            this.logger.warn('Meta CAPI is disabled. Missing META_CAPI_ACCESS_TOKEN in environment variables.');
        } else {
            this.logger.log('Meta CAPI is enabled.');
        }
    }

    /**
     * Hashes user data using SHA-256 as required by Meta CAPI
     */
    private hashData(data: string | undefined): string | undefined {
        if (!data) return undefined;
        // Meta requires: string to be trimmed, lowercase and hashed with SHA-256
        const cleanData = data.trim().toLowerCase();
        return crypto.createHash('sha256').update(cleanData).digest('hex');
    }

    /**
     * Send a Purchase event to Meta via Server-Side Tracking (Conversions API)
     * 
     * @param amount The donation amount in INR (in rupees, not paise)
     * @param eventId A unique ID for the event (e.g., transaction/donation ID) to deduplicate
     * @param userData User details for matching (email, phone, etc.)
     * @param eventSourceUrl The URL where the event took place (optional)
     */
    async trackPurchase(
        amount: number,
        eventId: string,
        userData: { email?: string; phone?: string; clientIpAddress?: string; clientUserAgent?: string },
        contentName: string = 'Temple Donation',
        eventSourceUrl?: string
    ) {
        if (!this.isEnabled) {
            return;
        }

        try {
            const currentTimestamp = Math.floor(Date.now() / 1000);

            // Clean phone number (Meta requires country code, e.g., 91 for India)
            let phone = userData.phone;
            if (phone && !phone.startsWith('+')) {
                // If it's a 10 digit Indian number without country code, add 91
                phone = phone.length === 10 ? `91${phone}` : phone;
            } else if (phone && phone.startsWith('+')) {
                phone = phone.replace('+', ''); // Remove + sign
            }

            const payload = {
                data: [
                    {
                        event_name: 'Purchase',
                        event_time: currentTimestamp,
                        action_source: 'website',
                        event_id: eventId, // Critical for deduplication against pixel
                        event_source_url: eventSourceUrl || this.configService.get<string>('SITE_URL') || 'https://iskconghaziabad.com',
                        user_data: {
                            em: this.hashData(userData.email),
                            ph: this.hashData(phone),
                            client_ip_address: userData.clientIpAddress,
                            client_user_agent: userData.clientUserAgent,
                        },
                        custom_data: {
                            currency: 'INR',
                            value: amount,
                            content_name: contentName,
                        },
                    }
                ],
                // test_event_code: 'TEST25464' // Use this during testing via env if needed
            };

            const response = await axios.post(
                `https://graph.facebook.com/v19.0/${this.pixelId}/events?access_token=${this.accessToken}`,
                payload
            );

            this.logger.log(`✅ Meta CAPI Purchase event tracked successfully for eventId: ${eventId}. Events received: ${response.data.events_received}`);
        } catch (error) {
            this.logger.error(`❌ Meta CAPI Tracking failed for eventId: ${eventId}`, error?.response?.data || error.message);
        }
    }
}
