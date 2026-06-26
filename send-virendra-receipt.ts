import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { ReceiptService } from './src/modules/receipt/receipt.service';
import { NotificationService } from './src/modules/notification/notification.service';
import { getModelToken } from '@nestjs/mongoose';
import { Donation } from './src/modules/donation/schemas/donation.schema';
import { Model } from 'mongoose';

/**
 * CONFIGURATION: Details for VIRENDRA KUMAR GUPTA
 */
const DONOR_DETAILS = {
    donorName: "VIRENDRA KUMAR GUPTA",
    donorEmail: "virendrakumargupta6@gmail.com",
    donorPhone: "919936618989",
    pan: "AARPG7812R",
    address: "FLAT NO. US-42, ALOPSHANKARI APTTS., 107/177, ALOPIBAGH",
    city: "PRAYAGRAJ",
    state: "Uttar Pradesh",
    pincode: "211006",
    amount: 1200,
    category: "Anna Daan",
    createdAt: new Date("2026-04-20"), // 20/04/2026
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
                paymentMethod: 6, // Cash (or manual)
                processedBy: 'Admin (Manual Script)'
            }
        });

        await donation.save();
        console.log(`✅ Donation record created with ID: ${donation._id}`);

        console.log('📄 Triggering receipt generation and sending (Email + WhatsApp)...');
        try {
            // generateAndSendReceipt handles receipt number generation, PDF creation, and sending to donor
            await receiptService.generateAndSendReceipt(donation._id.toString());
            
            // Reload donation to get the generated receipt number
            const updatedDonation = await donationModel.findById(donation._id);
            const receiptNumber = updatedDonation?.receiptNumber || "GENERATED";

            console.log(`✨ SUCCESS: Receipt ${receiptNumber} generated and sent successfully to Donor!`);
            
            // Send WhatsApp to Admin for confirmation
            console.log(`📱 Sending notification to Admin (${ADMIN_PHONE})...`);
            const adminMsg = `Hare Krishna Admin! 🙏 A manual receipt has been generated for:\n\nDonor: ${DONOR_DETAILS.donorName}\nAmount: ₹${DONOR_DETAILS.amount}\nCategory: ${DONOR_DETAILS.category}\nReceipt #: ${receiptNumber}\n\nReceipt PDF has been sent to ${DONOR_DETAILS.donorEmail} and their WhatsApp.`;
            await notificationService.sendWhatsapp(ADMIN_PHONE, adminMsg);
            console.log('✅ Admin WhatsApp notification sent.');
            
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
