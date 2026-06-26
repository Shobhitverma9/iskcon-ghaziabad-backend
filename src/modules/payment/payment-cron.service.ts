import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DonationService } from '../donation/donation.service';
import { PaymentService } from './payment.service';
import { ReceiptService } from '../receipt/receipt.service';

@Injectable()
export class PaymentCronService {
    private readonly logger = new Logger(PaymentCronService.name);

    constructor(
        private readonly donationService: DonationService,
        private readonly paymentService: PaymentService,
        private readonly receiptService: ReceiptService,
    ) { }

    @Cron(CronExpression.EVERY_30_MINUTES)
    async reconcilePendingDonations() {
        this.logger.log('Running reconciliation for pending donations...');
        const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        // Fetch donations that are stuck in pending and have an order ID
        const pendingDonations = await this.donationService.findAllPendingWithOrderId(twentyFourHoursAgo, fifteenMinsAgo);
        
        if (pendingDonations.length > 0) {
            this.logger.log(`Found ${pendingDonations.length} pending donations with Razorpay Order IDs. Checking status...`);
        } else {
            this.logger.log(`No pending donations require reconciliation.`);
        }

        for (const donation of pendingDonations) {
            try {
                if (!donation.razorpayOrderId) continue;

                const payments = await this.paymentService.fetchPaymentsForOrder(donation.razorpayOrderId);
                const successfulPayment = payments.items.find((p: any) => p.status === 'captured');

                if (successfulPayment) {
                    this.logger.log(`Found successful payment for pending donation ${donation._id}. Reconciling...`);
                    
                    await this.donationService.updateDonationRazorpayDetails(
                        donation._id.toString(),
                        donation.razorpayOrderId,
                        successfulPayment.id,
                        'RECONCILED_BY_CRON',
                        'captured'
                    );

                    try {
                        await this.receiptService.generateAndSendReceipt(donation._id.toString());
                        this.logger.log(`✅ Receipt generated via reconciliation for ${donation._id}`);
                    } catch (err: any) {
                        this.logger.error(`Failed to generate receipt during reconciliation for ${donation._id}`, err.message);
                    }
                } else if (payments.items.length > 0) {
                     // Check if any payment failed recently
                     const failedPayment = payments.items.find((p: any) => p.status === 'failed');
                     if (failedPayment) {
                         // We could mark it as failed, but we might want to wait. 
                         // For now, if there is a failed payment and NO captured payment, 
                         // let's leave it as pending or mark it failed depending on requirements.
                         // Let's rely on handleFailedPayment logic in the webhook.
                     }
                }
            } catch (err: any) {
                this.logger.error(`Error reconciling donation ${donation._id}: ${err.message}`);
            }
        }
    }
}
