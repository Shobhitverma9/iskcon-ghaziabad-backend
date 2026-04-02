import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NotificationService } from './modules/notification/notification.service';

async function testNewRecipient() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const notificationService = app.get(NotificationService);

  const recipient = "917011147999";
  const message = "Hare Krishna! This is a test message for the new Pooja Booking notification system.";

  try {
    console.log(`--- Sending Test WhatsApp to ${recipient} ---`);
    await notificationService.sendWhatsapp(recipient, message);
    console.log(`\n✅ Test message sent successfully to ${recipient}. Check server logs for API response.`);
  } catch (error) {
    console.error('\n--- Error ---');
    console.error(error);
  } finally {
    await app.close();
  }
}

testNewRecipient();
