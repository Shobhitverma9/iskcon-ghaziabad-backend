import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateSongCategoryDto {
    @IsString()
    title: string;

    @IsString()
    slug: string;

    @IsNumber()
    @IsOptional()
    order?: number;

    @IsString()
    @IsOptional()
    description?: string;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}

export class UpdateSongCategoryDto extends PartialType(CreateSongCategoryDto) { }
