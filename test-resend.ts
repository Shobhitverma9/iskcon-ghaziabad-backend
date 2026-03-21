import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { ReceiptService } from './src/modules/receipt/receipt.service';
import { getModelToken } from '@nestjs/mongoose';
import { Donation } from './src/modules/donation/schemas/donation.schema';
import { Model } from 'mongoose';

async function bootstrap() {
    console.log('Initializing application context...');
    const app = await NestFactory.createApplicationContext(AppModule);
    const receiptService = app.get(ReceiptService);
    const donationModel = app.get<Model<any>>(getModelToken(Donation.name));

    console.log('Finding a recent completed donation...');
    const donation = await donationModel.findOne({ status: 'completed' }).sort({ createdAt: -1 }).exec();

    if (donation) {
        console.log(`Found donation: ${donation._id} from ${donation.donorName || 'Unknown'}`);
        try {
            console.log('Triggering resendReceipt...');
            await receiptService.resendReceipt(donation._id.toString());
            console.log('✅ Successfully resent receipt!');
        } catch (err) {
            console.error('❌ Failed to resend receipt:', err);
        }
    } else {
        console.log('No completed donation found to test.');
    }

    await app.close();
    process.exit(0);
}

bootstrap().catch(err => {
    console.error(err);
    process.exit(1);
});
