import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Banner, BannerDocument } from './schemas/banner.schema';

@Injectable()
export class BannersService {
    constructor(
        @InjectModel(Banner.name) private bannerModel: Model<BannerDocument>,
    ) { }

    async findAll(): Promise<Banner[]> {
        return this.bannerModel.find().sort({ order: 1 }).exec();
    }

    async findOne(id: string): Promise<Banner> {
        return this.bannerModel.findById(id).exec();
    }

    async create(createBannerDto: any): Promise<Banner> {
        const count = await this.bannerModel.countDocuments();
        const banner = new this.bannerModel({
            ...createBannerDto,
            order: createBannerDto.order ?? count + 1 // Auto-increment order if not provided
        });
        return banner.save();
    }

    async update(id: string, updateBannerDto: any): Promise<Banner> {
        return this.bannerModel.findByIdAndUpdate(id, updateBannerDto, { new: true }).exec();
    }

    async remove(id: string): Promise<Banner> {
        return this.bannerModel.findByIdAndDelete(id).exec();
    }
}
