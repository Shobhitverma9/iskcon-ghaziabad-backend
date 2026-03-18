import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Donation, DonationDocument } from './schemas/donation.schema';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class DonationCronService {
    private readonly logger = new Logger(DonationCronService.name);

    constructor(
        @InjectModel(Donation.name) private donationModel: Model<DonationDocument>,
        private readonly notificationService: NotificationService,
    ) { }

    @Cron(CronExpression.EVERY_HOUR) // Check every hour
    async handleFailedDonationReminders() {
        this.logger.log('Running 2-hour failed donation reminder task...');

        const twoHoursAgo = new Date();
        twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

        const threeHoursAgo = new Date();
        threeHoursAgo.setHours(threeHoursAgo.getHours() - 3);

        // Find donations that:
        // 1. Are "failed" (or "pending" but stalled)
        // 2. Were created between 2 and 3 hours ago (to avoid reminding multiple times if cron runs every hour)
        // 3. Haven't been reminded yet (we might need a flag for this)
        // 4. Have a phone number

        // For now, let's find any failed donation from exactly ~2 hours ago
        const candidates = await this.donationModel.find({
            status: 'failed',
            createdAt: { $gte: threeHoursAgo, $lte: twoHoursAgo },
            reminderSent: { $ne: true }, // We'll add this field to the schema
            donorPhone: { $exists: true, $ne: '' }
        }).exec();

        this.logger.log(`Found ${candidates.length} candidates for WhatsApp reminder.`);

        for (const donation of candidates) {
            try {
                // IMPROVED LOGIC: Check if this donor has completed ANY donation since this failure
                // We check by email or phone (since they might not be logged in or have a userId yet)
                const hasDonatedSince = await this.donationModel.exists({
                    status: 'completed',
                    $or: [
                        { donorEmail: donation.donorEmail },
                        { donorPhone: donation.donorPhone }
                    ],
                    createdAt: { $gt: donation.createdAt }
                });

                if (hasDonatedSince) {
                    this.logger.log(`Skipping reminder for ${donation.donorPhone} - they already donated since the failure.`);
                    await this.donationModel.findByIdAndUpdate(donation._id, { reminderSent: true });
                    continue;
                }

                const message = `Hare Krishna ${donation.donorName || 'Devotee'}! 🙏 We noticed your donation of ₹${donation.amount} for ${donation.category || 'ISKCON Ghaziabad'} was not completed. Would you like to try again? Your support is very valuable to us. Click here to complete: https://iskconghaziabad.com/checkout?id=${donation._id}`;

                await this.notificationService.sendWhatsapp(donation.donorPhone, message);

                // Mark as reminded
                await this.donationModel.findByIdAndUpdate(donation._id, { reminderSent: true, lastReminderSentAt: new Date() });

                this.logger.log(`Reminder sent to ${donation.donorPhone} for donation ${donation._id}`);
            } catch (error) {
                this.logger.error(`Failed to send reminder for donation ${donation._id}`, error);
            }
        }
    }
}
