import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Donation } from './src/modules/donation/schemas/donation.schema';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';
import { ReceiptService } from './src/modules/receipt/receipt.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const donationModel = app.get<Model<any>>(getModelToken(Donation.name));
    const configService = app.get(ConfigService);
    const receiptService = app.get(ReceiptService);

    const keyId = configService.get<string>('RAZORPAY_KEY_ID');
    const keySecret = configService.get<string>('RAZORPAY_KEY_SECRET');

    if (!keyId || !keySecret) {
        console.error('Missing Razorpay keys');
        process.exit(1);
    }

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    console.log(`Fetching pending donations created after ${thirtyDaysAgo.toISOString()}...`);

    const pendingDonations = await donationModel.find({
        status: 'pending',
        createdAt: { $gte: thirtyDaysAgo }
    }).exec();

    console.log(`Found ${pendingDonations.length} pending donations.`);

    if (pendingDonations.length === 0) {
        console.log('No pending donations to reconcile.');
        await app.close();
        return;
    }

    let reconciledCount = 0;

    for (const donation of pendingDonations) {
        // If it already has an order ID, we can use the direct order fetch
        if (donation.razorpayOrderId) {
            try {
                const payments = await razorpay.orders.fetchPayments(donation.razorpayOrderId);
                const captured = payments.items.find(p => p.status === 'captured');
                if (captured) {
                    console.log(`[Order ID Match] Found captured payment for ${donation.donorEmail} (₹${donation.amount})`);
                    
                    await donationModel.findByIdAndUpdate(donation._id, {
                        status: 'completed',
                        paymentStatus: 'captured',
                        razorpayPaymentId: captured.id,
                        transactionId: captured.id,
                        updatedAt: new Date()
                    });

                    await receiptService.generateAndSendReceipt(donation._id.toString()).catch(e => console.error(`Receipt err: ${e.message}`));
                    reconciledCount++;
                    continue;
                }
            } catch (err: any) {
                // Ignore, might be bad order id
            }
        }

        // Search Razorpay around the creation time (-2 hours to +24 hours)
        const fromTs = Math.floor((donation.createdAt.getTime() - 2 * 60 * 60 * 1000) / 1000);
        const toTs = Math.floor((donation.createdAt.getTime() + 24 * 60 * 60 * 1000) / 1000);

        try {
            const result = await razorpay.payments.all({
                from: fromTs,
                to: toTs,
                count: 100 // Assume fewer than 100 payments in this window. Adjust if needed.
            });

            // Find matching captured payment
            const matchedPayment = result.items.find(p => {
                if (p.status !== 'captured') return false;
                if (p.amount !== donation.amount * 100) return false;
                
                // Match email or phone
                const emailMatch = p.email && p.email.toLowerCase() === donation.donorEmail.toLowerCase();
                
                // Clean phone numbers for comparison
                const dbPhone = donation.donorPhone ? donation.donorPhone.toString().replace(/\D/g, '').slice(-10) : '';
                const rzPhone = p.contact ? p.contact.toString().replace(/\D/g, '').slice(-10) : '';
                const phoneMatch = dbPhone && rzPhone && dbPhone === rzPhone;

                return emailMatch || phoneMatch;
            });

            if (matchedPayment) {
                // Double check it's not already linked to another completed donation
                const existingLinked = await donationModel.findOne({ razorpayPaymentId: matchedPayment.id });
                if (existingLinked && existingLinked.status === 'completed') {
                    // This payment belongs to another donation record. Skip.
                    continue;
                }

                console.log(`[Fuzzy Match] Reconciling ${donation.donorEmail} (₹${donation.amount}) with Payment ID: ${matchedPayment.id}`);
                
                await donationModel.findByIdAndUpdate(donation._id, {
                    status: 'completed',
                    paymentStatus: 'captured',
                    razorpayPaymentId: matchedPayment.id,
                    razorpayOrderId: matchedPayment.order_id,
                    transactionId: matchedPayment.id,
                    updatedAt: new Date()
                });

                await receiptService.generateAndSendReceipt(donation._id.toString()).catch(e => console.error(`Receipt err: ${e.message}`));
                reconciledCount++;
            }
        } catch (err: any) {
            console.error(`Razorpay API error for donation ${donation._id}: ${err.message}`);
        }
    }

    console.log(`\nReconciliation Complete!`);
    console.log(`Total Pending Checked: ${pendingDonations.length}`);
    console.log(`Total Reconciled & Completed: ${reconciledCount}`);

    await app.close();
}

bootstrap();
