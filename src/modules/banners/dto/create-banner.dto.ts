import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateBannerDto {
    @IsString()
    @IsNotEmpty()
    imageUrl: string;

    @IsString()
    @IsOptional()
    mobileImageUrl?: string;

    @IsString()
    @IsOptional()
    title?: string;

    @IsString()
    @IsOptional()
    subtitle?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    titleAlignment?: string;

    @IsString()
    @IsOptional()
    subtitleAlignment?: string;

    @IsString()
    @IsOptional()
    descriptionAlignment?: string;

    @IsString()
    @IsOptional()
    buttonAlignment?: string;

    @IsNumber()
    @IsOptional()
    titleTopSpacing?: number;

    @IsNumber()
    @IsOptional()
    titleSpacing?: number;

    @IsNumber()
    @IsOptional()
    subtitleTopSpacing?: number;

    @IsNumber()
    @IsOptional()
    subtitleSpacing?: number;

    @IsNumber()
    @IsOptional()
    descriptionTopSpacing?: number;

    @IsNumber()
    @IsOptional()
    descriptionSpacing?: number;

    @IsNumber()
    @IsOptional()
    buttonTopSpacing?: number;

    @IsString()
    @IsOptional()
    titleColor?: string;

    @IsNumber()
    @IsOptional()
    titleFontSize?: number;

    @IsString()
    @IsOptional()
    subtitleColor?: string;

    @IsNumber()
    @IsOptional()
    subtitleFontSize?: number;

    @IsString()
    @IsOptional()
    descriptionColor?: string;

    @IsNumber()
    @IsOptional()
    descriptionFontSize?: number;

    @IsString()
    @IsOptional()
    buttonTextColor?: string;

    @IsString()
    @IsOptional()
    buttonBgColor?: string;

    @IsString()
    @IsOptional()
    ctaText?: string;

    @IsString()
    @IsOptional()
    ctaLink?: string;

    @IsNumber()
    @IsOptional()
    order?: number;
}
