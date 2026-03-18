import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { ReceiptService } from './receipt.service'
import { ReceiptController } from './receipt.controller'
import { Donation, DonationSchema } from '../donation/schemas/donation.schema'
import { ReceiptCounter, ReceiptCounterSchema } from './schemas/receipt-counter.schema'
import { NotificationModule } from '../notification/notification.module'

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Donation.name, schema: DonationSchema },
            { name: ReceiptCounter.name, schema: ReceiptCounterSchema }
        ]),
        NotificationModule
    ],
    controllers: [ReceiptController],
    providers: [ReceiptService],
    exports: [ReceiptService]
})
export class ReceiptModule { }
