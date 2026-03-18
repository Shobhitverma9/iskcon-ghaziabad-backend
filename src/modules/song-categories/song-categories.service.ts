import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SongCategory, SongCategoryDocument } from './schemas/song-category.schema';
import { CreateSongCategoryDto, UpdateSongCategoryDto } from './dto/create-song-category.dto';

@Injectable()
export class SongCategoriesService {
    constructor(@InjectModel(SongCategory.name) private categoryModel: Model<SongCategoryDocument>) { }

    async create(createDto: CreateSongCategoryDto): Promise<SongCategory> {
        const created = new this.categoryModel(createDto);
        return created.save();
    }

    async findAll(): Promise<SongCategory[]> {
        return this.categoryModel.find({ isActive: true }).sort({ order: 1, title: 1 }).exec();
    }

    async findAllAdmin(): Promise<SongCategory[]> {
        return this.categoryModel.find().sort({ order: 1, title: 1 }).exec();
    }

    async findOne(id: string): Promise<SongCategory> {
        let query;
        if (id.match(/^[0-9a-fA-F]{24}$/)) {
            query = { _id: id };
        } else {
            query = { slug: id };
        }

        const category = await this.categoryModel.findOne(query).exec();
        if (!category) {
            throw new NotFoundException(`Category with identifier ${id} not found`);
        }
        return category;
    }

    async update(id: string, updateDto: UpdateSongCategoryDto): Promise<SongCategory> {
        return this.categoryModel.findByIdAndUpdate(id, updateDto, { new: true }).exec();
    }

    async remove(id: string): Promise<SongCategory> {
        return this.categoryModel.findByIdAndDelete(id).exec();
    }
}
