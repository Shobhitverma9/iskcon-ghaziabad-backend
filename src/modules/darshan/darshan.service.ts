import { Injectable, Inject, NotFoundException } from "@nestjs/common"
import { CACHE_MANAGER } from "@nestjs/cache-manager"
import { InjectModel } from "@nestjs/mongoose"
import { Model } from "mongoose"
import type { Cache } from "cache-manager"
import { Darshan, DarshanDocument } from "./darshan.schema"
import { CreateDarshanDto, GetDarshanDto } from "./darshan.dto"
import { StorageService } from "../../shared/storage/storage.service"
import sharp from "sharp"

export interface DarshanSchedule {
  name: string
  time: string
  type: "arti" | "darshan" | "class" | "closure"
  description: string
}

@Injectable()
export class DarshanService {
  private readonly schedules: DarshanSchedule[] = [
    {
      name: "Mangal Arti",
      time: "4:30 AM",
      type: "arti",
      description: "Begin your day with the sacred Mangal Arti",
    },
    {
      name: "Shringar Darshan",
      time: "7:30 AM",
      type: "darshan",
      description: "Witness the Lord adorned beautifully",
    },
    {
      name: "Bhagavad Gita Class",
      time: "8:00 AM",
      type: "class",
      description: "Discourse on Bhagavad Gita teachings",
    },
    {
      name: "Raj Bhoga Arti",
      time: "12:30 PM",
      type: "arti",
      description: "Witness the Lord accepting meal offering",
    },
    {
      name: "Uthapana Arti",
      time: "4:30 PM",
      type: "arti",
      description: "The Lord awakens for evening activities",
    },
    {
      name: "Sandhya Arti",
      time: "7:00 PM",
      type: "arti",
      description: "Evening prayers as day transitions to night",
    },
    {
      name: "Bhagavatam Discourse",
      time: "7:30 PM",
      type: "class",
      description: "Stories of Lord Krishna",
    },
    {
      name: "Temple Closure",
      time: "8:30 PM",
      type: "closure",
      description: "Temple closes for the night",
    },
  ]


  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectModel(Darshan.name) private darshanModel: Model<DarshanDocument>,
    private storageService: StorageService
  ) { }

  async getSchedule(): Promise<DarshanSchedule[]> {
    const cacheKey = "darshan:schedule"
    const cached = await this.cacheManager.get<DarshanSchedule[]>(cacheKey)

    if (cached) {
      return cached
    }

    await this.cacheManager.set(cacheKey, this.schedules, 86400000) // 24 hours

    return this.schedules
  }

  async getScheduleByType(type: string): Promise<DarshanSchedule[]> {
    const schedule = await this.getSchedule()
    return schedule.filter((s) => s.type === type)
  }

  async createDarshan(createDarshanDto: CreateDarshanDto): Promise<Darshan> {
    const { date, type } = createDarshanDto
    // Check if exists
    const existing = await this.darshanModel.findOne({ date: new Date(date), type })
    if (existing) {
      existing.images = createDarshanDto.images
      return existing.save()
    }
    const newDarshan = new this.darshanModel({
      ...createDarshanDto,
      date: new Date(date),
    })
    return newDarshan.save()
  }

  async getDarshanGallery(query: GetDarshanDto): Promise<Darshan | Darshan[]> {
    const filter: any = {}
    if (query.date) {
      // Create date range for the specific day
      const startDate = new Date(query.date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(query.date);
      endDate.setHours(23, 59, 59, 999);

      filter.date = {
        $gte: startDate,
        $lte: endDate
      };
    }
    if (query.type) {
      filter.type = query.type
    }

    // if both date and type are present, we likely want a single result
    if (query.date && query.type) {
      return this.darshanModel.findOne(filter).exec()
    }

    return this.darshanModel.find(filter).sort({ date: -1 }).exec()
  }

  async processAndUploadImage(file: Express.Multer.File): Promise<string> {
    const filename = `darshan/${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`

    const buffer = await sharp(file.buffer)
      .resize(1080, null, {
        withoutEnlargement: true, // Do not scale up if image is smaller than 1080p width
        fit: 'inside'
      })
      .toFormat('webp', { quality: 80 })
      .toBuffer()

    return this.storageService.uploadFile(buffer, filename, 'image/webp')
  }
}
