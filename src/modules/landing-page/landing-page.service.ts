import { Injectable, NotFoundException } from "@nestjs/common"
import { InjectModel } from "@nestjs/mongoose"
import { Model } from "mongoose"
import { LandingPage, LandingPageDocument } from "./schemas/landing-page.schema"
import { CreateLandingPageDto } from "./dto/create-landing-page.dto"
import { UpdateLandingPageDto } from "./dto/update-landing-page.dto"

@Injectable()
export class LandingPageService {
    constructor(
        @InjectModel(LandingPage.name) private landingPageModel: Model<LandingPageDocument>
    ) { }

    async create(createLandingPageDto: CreateLandingPageDto): Promise<LandingPage> {
        const createdPage = new this.landingPageModel(createLandingPageDto)
        return createdPage.save()
    }

    async findAll(): Promise<LandingPage[]> {
        return this.landingPageModel.find().exec()
    }

    async findOne(id: string): Promise<LandingPage> {
        const page = await this.landingPageModel.findById(id).exec()
        if (!page) {
            throw new NotFoundException(`Landing page with ID ${id} not found`)
        }
        return page
    }

    async findBySlug(slug: string): Promise<LandingPage> {
        const page = await this.landingPageModel.findOne({ slug }).exec()
        if (!page) {
            throw new NotFoundException(`Landing page with slug ${slug} not found`)
        }
        return page
    }

    async update(id: string, updateLandingPageDto: UpdateLandingPageDto): Promise<LandingPage> {
        const updatedPage = await this.landingPageModel
            .findByIdAndUpdate(id, updateLandingPageDto, { new: true })
            .exec()
        if (!updatedPage) {
            throw new NotFoundException(`Landing page with ID ${id} not found`)
        }
        return updatedPage
    }

    async remove(id: string): Promise<LandingPage> {
        const deletedPage = await this.landingPageModel.findByIdAndDelete(id).exec()
        if (!deletedPage) {
            throw new NotFoundException(`Landing page with ID ${id} not found`)
        }
        return deletedPage
    }
}
