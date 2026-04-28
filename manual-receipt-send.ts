import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { ReceiptService } from './src/modules/receipt/receipt.service';
import { NotificationService } from './src/modules/notification/notification.service';
import { getModelToken } from '@nestjs/mongoose';
import { Donation } from './src/modules/donation/schemas/donation.schema';
import { Model } from 'mongoose';

/**
 * CONFIGURATION: Details for Renu Taneja
 */
const DONOR_DETAILS = {
    donorName: "Renu Taneja",
    donorEmail: "miyashtaneja25@gmail.com",
    donorPhone: "917983311627",
    amount: 751,
    category: "100 Radha Naam Bricks",
    receiptNumber: "2619", // Provided by user
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
        
        // Remove receiptNumber from creation if we want generateAndSendReceipt to handle it, 
        // OR keep it and use resendReceipt logic. 
        // Since user gave "2619", we'll use that as the receipt number.
        const donation = new donationModel({
            ...DONOR_DETAILS,
            status: 'completed',
            paymentMethod: 'manual',
            paymentStatus: 'captured',
        });

        await donation.save();
        console.log(`✅ Donation record created with ID: ${donation._id}`);

        console.log('📄 Triggering receipt generation and sending (Email + WhatsApp)...');
        try {
            // Since we already set a receiptNumber, we use resendReceipt to force PDF generation/sending
            await receiptService.resendReceipt(donation._id.toString());
            console.log('✨ SUCCESS: Receipt generated and sent successfully to Donor!');
            
            // Send WhatsApp to Admin
            console.log(`📱 Sending notification to Admin (${ADMIN_PHONE})...`);
            const adminMsg = `Hare Krishna Admin! 🙏 A manual receipt has been generated for:\n\nDonor: ${DONOR_DETAILS.donorName}\nAmount: ₹${DONOR_DETAILS.amount}\nCategory: ${DONOR_DETAILS.category}\nReceipt #: ${DONOR_DETAILS.receiptNumber}\n\nReceipt PDF has been sent to ${DONOR_DETAILS.donorEmail} and their WhatsApp.`;
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
