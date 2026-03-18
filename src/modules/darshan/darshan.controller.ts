import { Controller, Get, Post, Body, Query, UseInterceptors, UploadedFile } from "@nestjs/common"
import { FileInterceptor } from "@nestjs/platform-express"
import { DarshanService } from "./darshan.service"
import { CreateDarshanDto, GetDarshanDto } from "./darshan.dto"

@Controller("darshan")
export class DarshanController {
  constructor(private readonly darshanService: DarshanService) { }

  @Get("schedule")
  async getSchedule() {
    return this.darshanService.getSchedule()
  }

  @Get("schedule/by-type")
  async getByType(@Query("type") type: string) {
    return this.darshanService.getScheduleByType(type)
  }

  @Post("gallery")
  async createDarshan(@Body() createDarshanDto: CreateDarshanDto) {
    return this.darshanService.createDarshan(createDarshanDto)
  }

  @Post("upload")
  @UseInterceptors(FileInterceptor("file"))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    const url = await this.darshanService.processAndUploadImage(file)
    return { url }
  }

  @Get("gallery")
  async getGallery(@Query() query: GetDarshanDto) {
    return this.darshanService.getDarshanGallery(query)
  }
}
