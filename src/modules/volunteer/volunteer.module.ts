import { Module } from "@nestjs/common"
import { MongooseModule } from "@nestjs/mongoose"
import { VolunteerController } from "./volunteer.controller"
import { VolunteerService } from "./volunteer.service"
import { Volunteer, VolunteerSchema } from "./schemas/volunteer.schema"
import { InquiryModule } from "../inquiry/inquiry.module"

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Volunteer.name, schema: VolunteerSchema }]),
    InquiryModule,
  ],
  controllers: [VolunteerController],
  providers: [VolunteerService],
  exports: [VolunteerService],
})
export class VolunteerModule { }
