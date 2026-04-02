import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PoojaService } from './modules/pooja/pooja.service';

async function testServiceDirectly() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const poojaService = app.get(PoojaService);

  const bookingId = "69ce3fea2bc831f233d65814"; // From previous success response
  const status = "pending";
  const metadata = {
    pendingReason: "Waiting for flower availability (Direct Service Test)"
  };

  try {
    console.log('--- Testing PoojaService.updateStatus Directly ---');
    console.log('Booking ID:', bookingId);
    console.log('Metadata:', JSON.stringify(metadata, null, 2));

    const updatedBooking = await poojaService.updateStatus(bookingId, status, metadata);

    if (updatedBooking) {
      console.log('\n--- Success ---');
      console.log('Updated Status:', updatedBooking.status);
      console.log('Updated Pending Reason:', (updatedBooking as any).pendingReason);
      console.log('\n✅ Pending Reason updated successfully in the database.');
    } else {
      console.log('\n❌ Booking not found.');
    }
  } catch (error) {
    console.error('\n--- Error ---');
    console.error(error);
  } finally {
    await app.close();
  }
}

testServiceDirectly();
