import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { NotificationService } from '../src/modules/notification/notification.service';

async function runTest() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const notificationService = app.get(NotificationService);

  const testEmails = [
    'shooffverm@gmail.com',
    'connecttokrishnanow@gmail.com',
    'shobhitdas15@gmail.com',
    'subalgaurdasbavs25@gmail.com',
    'subalgaurdas@gmail.com'
  ];

  const subject = 'ISKCON Ghaziabad: Email Broadcast Test';
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <h2 style="color: #f60;">Hare Krishna!</h2>
      <p>This is a test broadcast from the optimized ISKCON Ghaziabad system.</p>
      <p>We are testing 5 concurrent connections using the standard Postmark Batch API.</p>
      <p>If you see this, the system is working perfectly!</p>
      <p style="margin-top: 20px; font-size: 12px; color: #888;">
        Sent to: {{Email}}
      </p>
    </div>
  `;

  console.log('Starting broadcast test to 5 recipients...');
  try {
    await notificationService.sendBroadcastBatch(testEmails, subject, htmlBody);
    console.log('✅ Test broadcast submitted successfully!');
  } catch (error) {
    console.error('❌ Test broadcast failed:', error.message);
  } finally {
    await app.close();
  }
}

runTest();
