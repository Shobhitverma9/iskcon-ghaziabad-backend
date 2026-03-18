import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Song, SongDocument } from './schemas/song.schema';
import { CreateSongDto } from './dto/create-song.dto';

@Injectable()
export class SongsService {
    constructor(@InjectModel(Song.name) private songModel: Model<SongDocument>) { }

    async create(createSongDto: CreateSongDto): Promise<Song> {
        const createdSong = new this.songModel(createSongDto);
        return createdSong.save();
    }

    async findAll(categoryId?: string): Promise<Song[]> {
        const query = { isActive: true } as any;
        if (categoryId) {
            query.category = categoryId;
        }
        return this.songModel.find(query).populate('category').exec();
    }

    async findOne(id: string): Promise<Song> {
        let query;

        // Check if id is a valid 24-char hex string (ObjectId)
        if (id.match(/^[0-9a-fA-F]{24}$/)) {
            query = { _id: id };
        } else {
            // Otherwise treat it as a slug
            query = { slug: id };
        }

        const song = await this.songModel.findOne(query).populate('category').exec();
        if (!song) {
            throw new NotFoundException(`Song with identifier ${id} not found`);
        }
        return song;
    }
    async deleteAll(): Promise<void> {
        await this.songModel.deleteMany({}).exec();
    }

    async update(id: string, updateSongDto: any): Promise<Song> {
        return this.songModel.findByIdAndUpdate(id, updateSongDto, { new: true }).exec();
    }

    async remove(id: string): Promise<Song> {
        return this.songModel.findByIdAndDelete(id).exec();
    }
}
