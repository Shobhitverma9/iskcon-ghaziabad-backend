import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import { PaymentService } from './payment.service'
import { PaymentController } from './payment.controller'
import { DonationModule } from '../donation/donation.module'
import { PoojaModule } from '../pooja/pooja.module'
import { ReceiptModule } from '../receipt/receipt.module'
import { NotificationModule } from '../notification/notification.module'


@Module({
    imports: [
        ConfigModule,
        DonationModule, // Import to access DonationService
        PoojaModule, // Import to access PoojaService
        ReceiptModule, // Import to access ReceiptService
        NotificationModule,
    ],
    controllers: [PaymentController],
    providers: [PaymentService],
    exports: [PaymentService], // Export so other modules can use it
})
export class PaymentModule { }
