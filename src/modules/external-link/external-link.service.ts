import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ExternalLink, ExternalLinkDocument } from './schemas/external-link.schema';
import { CreateExternalLinkDto } from './dto/create-external-link.dto';

@Injectable()
export class ExternalLinkService {
    constructor(
        @InjectModel(ExternalLink.name) private externalLinkModel: Model<ExternalLinkDocument>,
    ) { }

    async create(createDto: CreateExternalLinkDto): Promise<ExternalLink> {
        const createdLink = new this.externalLinkModel(createDto);
        return createdLink.save();
    }

    async findAll(): Promise<ExternalLink[]> {
        return this.externalLinkModel.find().sort({ publishedAt: -1 }).exec();
    }

    async delete(id: string): Promise<any> {
        return this.externalLinkModel.findByIdAndDelete(id).exec();
    }
}
