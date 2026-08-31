import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const userModel = app.get<Model<any>>(getModelToken('User'));

    const tempPassword = 'TempPass@1234';
    const hashed = await bcrypt.hash(tempPassword, 10);

    const result = await userModel.updateOne(
        { email: 'kushaagra666@gmail.com' },
        { $set: { password: hashed } }
    );

    console.log('Update result:', result);
    console.log('\n✅ Temporary password set!');
    console.log('\nNow go to https://iskconghaziabad.com/signin and login with:');
    console.log('  Email:    kushaagra666@gmail.com');
    console.log('  Password: TempPass@1234');
    console.log('\n⚠️  Remember to restore original password or ask donor to reset via OTP after testing.\n');

    await app.close();
}

bootstrap();
