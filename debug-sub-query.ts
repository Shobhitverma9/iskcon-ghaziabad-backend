import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const subModel = app.get<Model<any>>(getModelToken('Subscription'));

    const userId = '6a68cab034f44287e6ff3768';

    console.log('=== Testing all query variations ===\n');

    // 1. String match
    const r1 = await subModel.find({ userId: userId }).exec();
    console.log('String match:', r1.length, r1.map(s => ({ _id: s._id, userId: s.userId, status: s.status })));

    // 2. ObjectId match
    const r2 = await subModel.find({ userId: new Types.ObjectId(userId) }).exec();
    console.log('ObjectId match:', r2.length);

    // 3. Regex match
    const r3 = await subModel.find({ userId: { $regex: userId } }).exec();
    console.log('Regex match:', r3.length);

    // 4. Get raw doc and check userId type
    const raw = await subModel.findOne({ razorpaySubscriptionId: 'sub_TIyE42nukGWQQF' }).lean().exec();
    if (raw) {
        console.log('\nRaw doc userId:', raw.userId);
        console.log('Raw doc userId type:', typeof raw.userId);
        console.log('Is ObjectId?', raw.userId instanceof Types.ObjectId);
    }

    await app.close();
}

bootstrap();
