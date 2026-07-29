import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const subModel = app.get<Model<any>>(getModelToken('Subscription'));

    const userId = '6a68cab034f44287e6ff3768';
    const razorpaySubscriptionId = 'sub_TIyE42nukGWQQF';

    // Link the subscription to the user
    const result = await subModel.updateOne(
        { razorpaySubscriptionId },
        { $set: { userId } }
    );

    console.log('Update result:', result);

    // Verify
    const sub = await subModel.findOne({ razorpaySubscriptionId }).exec();
    console.log('Subscription after update:', {
        _id: sub._id.toString(),
        userId: sub.userId,
        status: sub.status,
        amount: sub.amount,
        frequency: sub.frequency,
        razorpaySubscriptionId: sub.razorpaySubscriptionId
    });

    await app.close();
}

bootstrap();
