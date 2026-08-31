import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { ReceiptService } from './src/modules/receipt/receipt.service';
import { NotificationService } from './src/modules/notification/notification.service';
import { getModelToken } from '@nestjs/mongoose';
import { Donation } from './src/modules/donation/schemas/donation.schema';
import { Model } from 'mongoose';

/**
 * CONFIGURATION: Details for Manish Kumar Sahu
 * Payment: ₹1151 UPI | Date: 11/07/2026
 */
const DONOR_DETAILS = {
    donorName: "Manish Kumar Sahu",
    donorEmail: "noemail@iskcon-ghaziabad.org", // No email provided; receipt sent via WhatsApp only
    donorPhone: "919584007142",                  // Phone to receive WhatsApp receipt
    amount: 1151,
    address: "Gorakhpur",
    city: "Jabalpur",
    state: "Madhya Pradesh",
    pincode: "482001",
    category: "Donation",
    paymentMode: "UPI",
    createdAt: new Date("2026-07-11"),           // 11/07/2026
};

const ADMIN_PHONE = "918588910062";

async function bootstrap() {
    console.log('🚀 Initializing application context...');
    const app = await NestFactory.createApplicationContext(AppModule);

    try {
        const receiptService = app.get(ReceiptService);
        const notificationService = app.get(NotificationService);
        const donationModel = app.get<Model<any>>(getModelToken(Donation.name));

        console.log(`📝 Creating manual donation record for ${DONOR_DETAILS.donorName}...`);

        const donation = new donationModel({
            ...DONOR_DETAILS,
            status: 'completed',
            paymentMethod: 'manual',
            paymentStatus: 'captured',
            metadata: {
                paymentMethod: 'UPI',
                processedBy: 'Admin (Manual Script)',
                note: 'Receipt requested via WhatsApp message from Raghav Digital'
            }
        });

        await donation.save();
        console.log(`✅ Donation record created with ID: ${donation._id}`);

        console.log('📄 Triggering receipt generation and sending (WhatsApp)...');
        try {
            // generateAndSendReceipt handles receipt number generation, PDF creation, and sending to donor
            await receiptService.generateAndSendReceipt(donation._id.toString());

            // Reload donation to get the generated receipt number
            const updatedDonation = await donationModel.findById(donation._id);
            const receiptNumber = updatedDonation?.receiptNumber || "GENERATED";
            console.log(`[DEBUG] Receipt URL: ${updatedDonation?.receiptUrl}`);

            console.log(`✨ SUCCESS: Receipt ${receiptNumber} generated and sent to donor WhatsApp (${DONOR_DETAILS.donorPhone})!`);

            // Send WhatsApp to Admin (8588910062) with confirmation
            console.log(`📱 Sending confirmation to Admin (${ADMIN_PHONE})...`);
            const adminMsg = `Hare Krishna Admin! 🙏 A manual receipt has been generated for:\n\nDonor: ${DONOR_DETAILS.donorName}\nAmount: ₹${DONOR_DETAILS.amount}\nPayment: ${DONOR_DETAILS.paymentMode}\nCity: ${DONOR_DETAILS.city}, ${DONOR_DETAILS.state} - ${DONOR_DETAILS.pincode}\nCategory: ${DONOR_DETAILS.category}\nReceipt #: ${receiptNumber}\n\nReceipt PDF has been sent to their WhatsApp (${DONOR_DETAILS.donorPhone}).`;
            await notificationService.sendWhatsapp(ADMIN_PHONE, adminMsg);
            console.log('✅ Admin WhatsApp confirmation sent.');

        } catch (err) {
            console.error('❌ Failed to process receipt:', err.message);
        }

    } catch (error) {
        console.error('❌ Script failed:', error);
    } finally {
        await app.close();
        process.exit(0);
    }
}

bootstrap().catch(err => {
    console.error(err);
    process.exit(1);
});
