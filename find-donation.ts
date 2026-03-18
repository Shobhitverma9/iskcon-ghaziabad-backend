import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Donation } from './src/modules/donation/schemas/donation.schema';
import { Model } from 'mongoose';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const donationModel = app.get<Model<any>>(getModelToken(Donation.name));

    const donation = await donationModel.findOne({ status: 'completed' }).sort({ createdAt: -1 }).exec();

    if (donation) {
        console.log('FOUND_ID:' + donation._id);
    } else {
        console.log('NO_DONATION_FOUND');
    }

    await app.close();
}

bootstrap();
