import { Injectable, Inject } from "@nestjs/common"
import { InjectModel } from "@nestjs/mongoose"
import { CACHE_MANAGER } from "@nestjs/cache-manager"
import { Model } from "mongoose"
import type { Cache } from "cache-manager"
import { Volunteer, VolunteerDocument } from "./schemas/volunteer.schema"
import { InquiryService } from "../inquiry/inquiry.service"

@Injectable()
export class VolunteerService {
  constructor(
    @InjectModel(Volunteer.name) private volunteerModel: Model<VolunteerDocument>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly inquiryService: InquiryService,
  ) { }

  async create(createVolunteerDto: any): Promise<Volunteer> {
    const volunteer = new this.volunteerModel(createVolunteerDto)
    const savedVolunteer = await volunteer.save()

    // Create an inquiry for the admin panel
    await this.inquiryService.create({
      name: savedVolunteer.fullName,
      email: savedVolunteer.email,
      phone: savedVolunteer.phone,
      type: "volunteer",
      details: `Volunteer registration. Areas: ${savedVolunteer.selectedAreas.join(", ")}. Availability: ${savedVolunteer.availability}.`,
      specialNote: savedVolunteer.motivation,
    })

    await this.cacheManager.del("volunteer:stats")

    return savedVolunteer
  }

  async findById(id: string): Promise<Volunteer | null> {
    const cacheKey = `volunteer:${id}`
    const cached = await this.cacheManager.get<Volunteer>(cacheKey)

    if (cached) {
      return cached
    }

    const volunteer = await this.volunteerModel.findById(id).exec()

    if (volunteer) {
      await this.cacheManager.set(cacheKey, volunteer, 3600000)
    }

    return volunteer
  }

  async getStats(): Promise<any> {
    const cacheKey = "volunteer:stats"
    const cached = await this.cacheManager.get(cacheKey)

    if (cached) {
      return cached
    }

    const total = await this.volunteerModel.countDocuments().exec()
    const approved = await this.volunteerModel.countDocuments({ status: "approved" }).exec()
    const pending = await this.volunteerModel.countDocuments({ status: "pending" }).exec()

    const stats = {
      total,
      approved,
      pending,
    }

    await this.cacheManager.set(cacheKey, stats, 1800000) // 30 mins

    return stats
  }
}
