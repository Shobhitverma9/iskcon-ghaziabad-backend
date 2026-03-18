import { Module } from "@nestjs/common"
import { MongooseModule } from "@nestjs/mongoose"
import { NotificationModule } from "../notification/notification.module"
import { InquiryController } from "./inquiry.controller"
import { InquiryService } from "./inquiry.service"
import { Inquiry, InquirySchema } from "./schemas/inquiry.schema"

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Inquiry.name, schema: InquirySchema }]),
        NotificationModule
    ],
    controllers: [InquiryController],
    providers: [InquiryService],
    exports: [InquiryService]
})
export class InquiryModule { }
