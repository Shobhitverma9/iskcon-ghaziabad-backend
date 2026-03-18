import { Module } from "@nestjs/common"
import { MongooseModule } from "@nestjs/mongoose"
import { PoojaController } from "./pooja.controller"
import { PoojaService } from "./pooja.service"
import { PoojaBooking, PoojaSchema } from "./schemas/pooja.schema"
import { PujaItem, PujaItemSchema } from "./schemas/puja-item.schema"
import { StorageModule } from "../../shared/storage/storage.module"
import { ImageProcessingService } from "../../shared/image/image-processing.service"
import { NotificationModule } from "../notification/notification.module"
import { User, UserSchema } from "../auth/schemas/user.schema"


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PoojaBooking.name, schema: PoojaSchema },
      { name: PujaItem.name, schema: PujaItemSchema },
      { name: User.name, schema: UserSchema },
    ]),
    StorageModule,
    NotificationModule,
  ],
  controllers: [PoojaController],
  providers: [PoojaService, ImageProcessingService],
  exports: [PoojaService],
})
export class PoojaModule { }
