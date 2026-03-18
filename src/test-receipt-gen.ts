
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ReceiptService } from './modules/receipt/receipt.service';
import { DonationService } from './modules/donation/donation.service';
import { Logger } from '@nestjs/common';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const logger = new Logger('ManualReceiptTest');

    try {
        const receiptService = app.get(ReceiptService);
        const donationService = app.get(DonationService);

        // Get the most recent donation directly from model to bypass cache
        const donationModel = (donationService as any).donationModel;
        const donation = await donationModel
            .findOne({ status: 'completed' })
            .sort({ createdAt: -1 })
            .exec();

        if (!donation) {
            logger.error('No completed donations found to test with.');
            return;
        }

        logger.log(`🧪 Testing receipt generation for Donation ID: ${donation._id}`);
        logger.log(`Details: ${donation.donorName} - ₹${donation.amount}`);

        // Force regeneration even if it exists (for testing)
        // We'll reset the receipt number temporarily in memory if needed, 
        // but generateAndSendReceipt checks DB. 
        // Let's just unset it in DB for this test if it exists.
        if (donation.receiptNumber || donation.receiptUrl) {
            logger.warn(`Receipt fields exist. Clearing them for test...`);
            await (donationService as any).donationModel.updateOne(
                { _id: donation._id },
                { $unset: { receiptNumber: 1, receiptUrl: 1, receiptGeneratedAt: 1, receiptSentAt: 1 } }
            );
        }

        await receiptService.generateAndSendReceipt(donation._id.toString());

        logger.log('✅ Test completed successfully');

    } catch (error) {
        logger.error('❌ Test failed', error);
    } finally {
        await app.close();
    }
}

bootstrap();
