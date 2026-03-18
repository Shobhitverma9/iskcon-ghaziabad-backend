import { Module } from "@nestjs/common"
import { DarshanService } from "./darshan.service"
import { DarshanController } from "./darshan.controller"
import { MongooseModule } from "@nestjs/mongoose"
import { Darshan, DarshanSchema } from "./darshan.schema"

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Darshan.name, schema: DarshanSchema }])
  ],
  providers: [DarshanService],
  controllers: [DarshanController],
  exports: [DarshanService],
})
export class DarshanModule { }
