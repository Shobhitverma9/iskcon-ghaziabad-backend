import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { YatraController } from './yatra.controller';
import { YatraService } from './yatra.service';
import { YatraBooking, YatraBookingSchema } from './schemas/yatra-booking.schema';
import { PaymentModule } from '../payment/payment.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: YatraBooking.name, schema: YatraBookingSchema }]),
    forwardRef(() => PaymentModule),
    NotificationModule,
  ],
  controllers: [YatraController],
  providers: [YatraService],
  exports: [YatraService],
})
export class YatraModule {}
