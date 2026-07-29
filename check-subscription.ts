import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const donationModel = app.get<Model<any>>(getModelToken('Donation'));

    console.log('=== Checking all records for Kushaagra ===\n');

    // Check donations with subscription info
    const donations = await donationModel.find({
        donorEmail: { $regex: 'kushaagra666', $options: 'i' }
    }).exec();
    
    console.log(`Total donations found: ${donations.length}`);
    donations.forEach(d => {
        console.log({
            _id: d._id.toString(),
            amount: d.amount,
            type: d.type,
            status: d.status,
            category: d.category,
            razorpaySubscriptionId: d.razorpaySubscriptionId,
            razorpayOrderId: d.razorpayOrderId,
            paymentStatus: d.paymentStatus,
            userId: d.userId,
            createdAt: d.createdAt
        });
    });

    // Check subscription model directly
    let subModel;
    try {
        subModel = app.get<Model<any>>(getModelToken('Subscription'));
        console.log('\n=== Checking Subscription collection ===');
        
        // By userId
        const byUserId = await subModel.find({ userId: '6a68cab034f44287e6ff3768' }).exec();
        console.log(`Subscriptions by userId: ${byUserId.length}`);
        byUserId.forEach(s => console.log(JSON.stringify(s, null, 2)));

        // By razorpay subscription ID from the donation
        const byRazorpayId = await subModel.find({ 
            razorpaySubscriptionId: 'sub_TIyE42nukGWQQF' 
        }).exec();
        console.log(`\nSubscriptions by razorpaySubscriptionId: ${byRazorpayId.length}`);
        byRazorpayId.forEach(s => console.log(JSON.stringify(s, null, 2)));

        // Broad search - show last 5
        const recent = await subModel.find().sort({ createdAt: -1 }).limit(5).exec();
        console.log(`\nLast 5 subscriptions in DB:`);
        recent.forEach(s => console.log({
            _id: s._id.toString(),
            userId: s.userId,
            razorpaySubscriptionId: s.razorpaySubscriptionId,
            status: s.status,
            createdAt: s.createdAt
        }));
    } catch (e) {
        console.log('Subscription model error:', e.message);
    }

    await app.close();
}

bootstrap();
