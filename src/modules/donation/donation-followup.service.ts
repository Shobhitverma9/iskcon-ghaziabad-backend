import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { Cron, CronExpression } from '@nestjs/schedule'
import { Model } from 'mongoose'
import { Donation, DonationDocument } from './schemas/donation.schema'
import { NotificationService } from '../notification/notification.service'
import { DonationService } from './donation.service'

@Injectable()
export class DonationFollowupService {
    private readonly logger = new Logger(DonationFollowupService.name)

    constructor(
        private readonly configService: ConfigService,
        @InjectModel(Donation.name) private donationModel: Model<DonationDocument>,
        private readonly notificationService: NotificationService,
        private readonly donationService: DonationService,
    ) { }

    /**
     * Runs every 30 minutes.
     * Finds failed donations where:
     *   - status is 'failed'
     *   - reminderSent is false
     *   - updatedAt is between 2 and 24 hours ago (to avoid sending too late)
     * Then checks the donor hasn't made a successful donation since,
     * sends email + WhatsApp, and marks reminderSent = true.
     */
    @Cron(CronExpression.EVERY_30_MINUTES)
    async sendFailedPaymentFollowUps(): Promise<void> {
        this.logger.log('⏰ Running 2-hour failed payment follow-up job...')

        const now = new Date()
        const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

        try {
            const failedDonations = await this.donationModel.find({
                status: 'failed',
                reminderSent: { $ne: true },
                updatedAt: { $gte: twentyFourHoursAgo, $lte: twoHoursAgo },
            }).exec()

            this.logger.log(`Found ${failedDonations.length} failed donations needing follow-up`)

            for (const donation of failedDonations) {
                try {
                    // Check if donor successfully donated since this failure
                    const successfulDonation = await this.donationModel.findOne({
                        donorPhone: donation.donorPhone,
                        donorEmail: donation.donorEmail,
                        status: 'completed',
                        createdAt: { $gte: donation.updatedAt },
                    }).exec()

                    if (successfulDonation) {
                        // Donor already donated — mark reminder sent but don't message them
                        this.logger.log(`Donor ${donation.donorEmail} already donated after failure — skipping follow-up`)
                        await this.donationModel.findByIdAndUpdate(donation._id, {
                            reminderSent: true,
                            lastReminderSentAt: now,
                        })
                        continue
                    }

                    // Resolve donation page URL
                    const baseUrl = this.configService.get<string>('SITE_URL') || 'https://iskconghaziabad.com'
                    let categoryPath = '/donate'
                    try {
                        const categoryDoc = await this.donationService.getCategoryByTitle(donation.category || '')
                        if (categoryDoc && categoryDoc.slug) {
                            categoryPath = `/donate/${categoryDoc.slug}`
                        }
                    } catch { /* ignore */ }
                    const donationPageUrl = `${baseUrl}${categoryPath}`

                    const donorName = donation.donorName || 'Devotee'
                    const amount = donation.amount
                    const category = donation.category || 'Donation'

                    // Send email
                    if (donation.donorEmail) {
                        await this.notificationService.sendCancellationEmail(
                            donation.donorEmail,
                            donorName,
                            amount,
                            category,
                            donationPageUrl,
                        ).catch(err => this.logger.error(`Follow-up email failed for ${donation.donorEmail}`, err))
                    }

                    // Send WhatsApp
                    if (donation.donorPhone) {
                        await this.notificationService.sendWhatsappCancelledPayment(
                            donation.donorPhone,
                            donorName,
                            amount,
                            category,
                            donationPageUrl,
                        ).catch(err => this.logger.error(`Follow-up WhatsApp failed for ${donation.donorPhone}`, err))
                    }

                    // Mark as reminded
                    await this.donationModel.findByIdAndUpdate(donation._id, {
                        reminderSent: true,
                        lastReminderSentAt: now,
                    })

                    this.logger.log(`✅ Follow-up sent to ${donation.donorEmail || donation.donorPhone} for donation ${donation._id}`)
                } catch (err) {
                    this.logger.error(`Failed to process follow-up for donation ${donation._id}`, err)
                }
            }
        } catch (error) {
            this.logger.error('Failed payment follow-up job failed', error)
        }
    }
}
