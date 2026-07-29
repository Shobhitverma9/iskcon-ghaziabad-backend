import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Donation } from './src/modules/donation/schemas/donation.schema';
import { User } from './src/modules/auth/schemas/user.schema'; // Assuming User schema is here
import { Model } from 'mongoose';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const donationModel = app.get<Model<any>>(getModelToken(Donation.name));
    
    let userModel;
    try {
        userModel = app.get<Model<any>>(getModelToken('User'));
    } catch (e) {
        console.log('User model not found by string, trying class name if available');
    }

    if (userModel) {
        console.log('Searching for User...');
        const userByEmail = await userModel.findOne({ email: { $regex: 'kushaagra666', $options: 'i' } }).exec();
        console.log('User by email:', userByEmail ? userByEmail._id : 'Not found');

        const userByPhone = await userModel.findOne({ phone: { $regex: '9105075915', $options: 'i' } }).exec();
        console.log('User by phone:', userByPhone ? userByPhone._id : 'Not found');
        
        if (userByEmail || userByPhone) {
            const userId = (userByEmail || userByPhone)._id.toString();
            console.log('Found userId:', userId);
            
            // Link the donation
            const updateResult = await donationModel.updateMany(
                { donorEmail: { $regex: 'kushaagra666', $options: 'i' }, userId: { $exists: false } },
                { $set: { userId: userId } }
            );
            console.log('Update result for donation:', updateResult);
        }
    }

    await app.close();
}

bootstrap();
