import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Festival, FestivalDocument } from './schemas/festival.schema';
import { CreateFestivalDto } from './dto/create-festival.dto';
import { UpdateFestivalDto } from './dto/update-festival.dto';

@Injectable()
export class FestivalService {
    constructor(
        @InjectModel(Festival.name) private festivalModel: Model<FestivalDocument>,
    ) { }

    async create(createFestivalDto: CreateFestivalDto): Promise<Festival> {
        const createdFestival = new this.festivalModel(createFestivalDto);
        return createdFestival.save();
    }

    async findAllAdmin(): Promise<Festival[]> {
        return this.festivalModel.find().sort({ createdAt: -1 }).exec();
    }

    async findAllActive(): Promise<Festival[]> {
        const now = new Date();
        return this.festivalModel.find({
            isActive: true,
            // Optional: Filter by expiration date if needed
            // $or: [{ expirationDate: { $gte: now } }, { expirationDate: null }]
        }).sort({ startDate: 1 }).exec();
    }

    async findOne(id: string): Promise<Festival> {
        const festival = await this.festivalModel.findById(id).exec();
        if (!festival) {
            throw new NotFoundException(`Festival with ID ${id} not found`);
        }
        return festival;
    }

    async findBySlug(slug: string): Promise<Festival> {
        const festival = await this.festivalModel.findOne({ slug }).exec();
        if (!festival) {
            throw new NotFoundException(`Festival with slug ${slug} not found`);
        }
        return festival;
    }

    async update(id: string, updateFestivalDto: UpdateFestivalDto): Promise<Festival> {
        const updatedFestival = await this.festivalModel
            .findByIdAndUpdate(id, updateFestivalDto, { new: true })
            .exec();
        if (!updatedFestival) {
            throw new NotFoundException(`Festival with ID ${id} not found`);
        }
        return updatedFestival;
    }

    async remove(id: string): Promise<Festival> {
        const deletedFestival = await this.festivalModel.findByIdAndDelete(id).exec();
        if (!deletedFestival) {
            throw new NotFoundException(`Festival with ID ${id} not found`);
        }
        return deletedFestival;
    }
}
