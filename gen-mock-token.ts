import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as jwt from 'jsonwebtoken';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const sessionModel = app.get<Model<any>>(getModelToken('Session'));

    const userId = '6a68cab034f44287e6ff3768';
    const email = 'kushaagra666@gmail.com';
    const role = 'user';
    const JWT_SECRET = '4c5875ef062bb449c8ed2e8798fb9ab60ac84eb696aedb3986a25396fa8debe22025ed439de764f4659fee3b2384340ac583a9f573a43641b4158406fc76d4b4';

    // Generate fresh token valid for 2 hours
    const payload = { sub: userId, email, role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '2h' });

    // Save session to DB so backend session validation passes
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 2);

    await sessionModel.create({
        userId,
        token,
        expiresAt,
        isActive: true,
        ipAddress: '127.0.0.1',
        userAgent: 'AdminMockSession'
    });

    console.log('\n✅ Session created in DB. Token valid for 2 hours.\n');
    console.log('=== STEP 1: Go to https://iskconghaziabad.com/dashboard ===');
    console.log('=== STEP 2: Open DevTools Console (F12) ===');
    console.log('=== STEP 3: Type:  allow pasting  and press Enter ===');
    console.log('=== STEP 4: Paste the line below and press Enter ===\n');
    console.log(`localStorage.setItem('auth_token', '${token}'); localStorage.setItem('user', JSON.stringify({id:'${userId}',email:'${email}',firstName:'KUSHAAGRA',lastName:'CHAUHAN',role:'${role}',phone:'9105075915'})); window.location.href='/dashboard';`);
    console.log('\n');

    await app.close();
}

bootstrap();
