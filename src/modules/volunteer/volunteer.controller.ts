import { Controller, Post, Get, Param, Body } from "@nestjs/common"
import { VolunteerService } from "./volunteer.service"

@Controller("volunteers")
export class VolunteerController {
  constructor(private readonly volunteerService: VolunteerService) { }

  @Post()
  async register(@Body() createVolunteerDto: any) {
    return this.volunteerService.create(createVolunteerDto)
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.volunteerService.findById(id);
  }

  @Get("stats/overview")
  async getStats() {
    return this.volunteerService.getStats()
  }
}
