import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Donation } from './src/modules/donation/schemas/donation.schema';
import { Model } from 'mongoose';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const donationModel = app.get<Model<any>>(getModelToken(Donation.name));

    // Check what is stored in userId field of the donation
    const donation = await donationModel.findOne({ donorEmail: { $regex: 'kushaagra666', $options: 'i' } }).exec();
    
    if (donation) {
        console.log('Donation found!');
        console.log('_id:', donation._id.toString());
        console.log('userId field:', donation.userId);
        console.log('userId type:', typeof donation.userId);
        if (donation.userId) {
            console.log('userId toString:', donation.userId.toString());
        }
        console.log('Full donation:', JSON.stringify(donation, null, 2));
    } else {
        console.log('No donation found!');
    }

    // Also try querying with the userId string that was set
    const userId = '6a68cab034f44287e6ff3768';
    
    // Try string match
    const byStringId = await donationModel.find({ userId: userId }).exec();
    console.log('\nQuery { userId: string } results:', byStringId.length);

    await app.close();
}

bootstrap();
