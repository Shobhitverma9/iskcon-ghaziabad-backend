import { Module } from "@nestjs/common"
import { MongooseModule } from "@nestjs/mongoose"
import { DonationController } from "./donation.controller"
import { DonationService } from "./donation.service"
import { Donation, DonationSchema } from "./schemas/donation.schema"
import { DonationCategory, DonationCategorySchema } from "./schemas/donation-category.schema"
import { DonationItem, DonationItemSchema } from "./schemas/donation-item.schema"
import { Certificate, CertificateSchema } from "./schemas/certificate.schema"
import { Subscription, SubscriptionSchema } from "./schemas/subscription.schema"
import { ImageProcessingService } from "../../shared/image/image-processing.service"
import { StorageModule } from "../../shared/storage/storage.module"
import { NotificationModule } from "../notification/notification.module"
import { User, UserSchema } from "../auth/schemas/user.schema"
import { DonationSettings, DonationSettingsSchema } from "./schemas/donation-settings.schema"
import { ReceiptModule } from "../receipt/receipt.module"
import { DonationSettingsController } from "./donation-settings.controller"
import { DonationSettingsService } from "./donation-settings.service"
import { DonationCronService } from "./donation-cron.service"
import { DonationFollowupService } from "./donation-followup.service"

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Donation.name, schema: DonationSchema },
      { name: DonationCategory.name, schema: DonationCategorySchema },
      { name: DonationItem.name, schema: DonationItemSchema },
      { name: Certificate.name, schema: CertificateSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: User.name, schema: UserSchema },
      { name: DonationSettings.name, schema: DonationSettingsSchema },
    ]),
    // MongooseModule.forFeature included above
    StorageModule,
    NotificationModule,
    ReceiptModule,
  ],
  controllers: [DonationSettingsController, DonationController],
  providers: [DonationService, ImageProcessingService, DonationSettingsService, DonationCronService, DonationFollowupService],
  exports: [DonationService],
})
export class DonationModule { }
