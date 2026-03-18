import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExternalLinkController } from './external-link.controller';
import { ExternalLinkService } from './external-link.service';
import { ExternalLink, ExternalLinkSchema } from './schemas/external-link.schema';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: ExternalLink.name, schema: ExternalLinkSchema }]),
    ],
    controllers: [ExternalLinkController],
    providers: [ExternalLinkService],
})
export class ExternalLinkModule { }
