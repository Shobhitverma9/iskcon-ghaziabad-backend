import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Donation } from './src/modules/donation/schemas/donation.schema';
import { Model } from 'mongoose';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const donationModel = app.get<Model<any>>(getModelToken(Donation.name));

    console.log('Searching for mehulbaria596@gmail.com or 7283980696...');
    
    // Search by email
    const donationsByEmail = await donationModel.find({ donorEmail: { $regex: 'mehulbaria', $options: 'i' } }).exec();
    console.log('Found by email:', donationsByEmail.length);
    donationsByEmail.forEach(d => console.log(JSON.stringify(d, null, 2)));

    // Search by phone
    const donationsByPhone = await donationModel.find({ donorPhone: { $regex: '7283.*980696' } }).exec();
    console.log('Found by phone:', donationsByPhone.length);
    donationsByPhone.forEach(d => console.log(JSON.stringify(d, null, 2)));

    // Try a broad search
    const allRecent = await donationModel.find().sort({ createdAt: -1 }).limit(20).exec();
    console.log('Recent 20 donations:', allRecent.map(d => ({
        id: d._id,
        email: d.donorEmail,
        amount: d.amount,
        status: d.status,
        date: d.createdAt
    })));

    await app.close();
}

bootstrap();
