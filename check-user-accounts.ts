import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const userModel = app.get<Model<any>>(getModelToken('User'));

    console.log('=== Finding all users with email or phone ===');
    
    // Search by email
    const byEmail = await userModel.find({ email: { $regex: 'kushaagra666', $options: 'i' } }).exec();
    console.log('Users with email kushaagra666:', byEmail.length);
    byEmail.forEach(u => {
        console.log({
            _id: u._id.toString(),
            email: u.email,
            phone: u.phone,
            firstName: u.firstName,
            lastName: u.lastName,
            isEmailVerified: u.isEmailVerified,
            createdAt: u.createdAt
        });
    });

    // Search by phone - try different formats
    const byPhone1 = await userModel.find({ phone: '9105075915' }).exec();
    console.log('\nUsers with phone 9105075915:', byPhone1.length);
    byPhone1.forEach(u => console.log({ _id: u._id.toString(), email: u.email, phone: u.phone }));

    const byPhone2 = await userModel.find({ phone: '+919105075915' }).exec();
    console.log('Users with phone +919105075915:', byPhone2.length);
    byPhone2.forEach(u => console.log({ _id: u._id.toString(), email: u.email, phone: u.phone }));

    const byPhone3 = await userModel.find({ phone: { $regex: '9105075915' } }).exec();
    console.log('Users with phone regex 9105075915:', byPhone3.length);
    byPhone3.forEach(u => console.log({ _id: u._id.toString(), email: u.email, phone: u.phone }));

    await app.close();
}

bootstrap();
