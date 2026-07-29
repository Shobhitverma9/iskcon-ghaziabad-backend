import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Donation } from './src/modules/donation/schemas/donation.schema';
import { Model } from 'mongoose';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const donationModel = app.get<Model<any>>(getModelToken(Donation.name));

    console.log('Searching for kushaagra666@gmail.com or 9105075915...');
    
    // Search by email
    const donationsByEmail = await donationModel.find({ donorEmail: { $regex: 'kushaagra666', $options: 'i' } }).exec();
    console.log('Found by email:', donationsByEmail.length);
    donationsByEmail.forEach(d => console.log(JSON.stringify(d, null, 2)));

    // Search by phone
    const donationsByPhone = await donationModel.find({ donorPhone: { $regex: '9105075915', $options: 'i' } }).exec();
    console.log('Found by phone:', donationsByPhone.length);
    donationsByPhone.forEach(d => console.log(JSON.stringify(d, null, 2)));

    await app.close();
}

bootstrap();
