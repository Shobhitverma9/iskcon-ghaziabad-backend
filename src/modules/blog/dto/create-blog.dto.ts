import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsDateString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

class SeoDto {
    @IsString()
    @IsOptional()
    title: string;

    @IsString()
    @IsOptional()
    description: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    keywords: string[];
}

export class CreateBlogDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsOptional()
    slug?: string;

    @IsNotEmpty()
    content: any; // Editor.js JSON output

    @IsString()
    @IsOptional()
    featuredImage?: string;

    @IsString()
    @IsNotEmpty()
    author: string;

    @IsString()
    @IsOptional()
    category?: string;


    @IsOptional()
    @ValidateNested()
    @Type(() => SeoDto)
    seo?: SeoDto;

    @IsString()
    @IsOptional()
    @IsIn(['draft', 'published'])
    status?: string;

    @IsOptional()
    @IsDateString()
    publishedAt?: Date;
}
