import { IsString, IsNotEmpty, IsDateString, IsOptional, IsArray, ValidateNested, IsNumber, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class SponsorshipItemDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsNumber()
    amount: number;

    @IsString()
    @IsOptional()
    image?: string;
}

export class CreateFestivalDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsNotEmpty()
    slug: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsDateString()
    @IsOptional()
    startDate?: string;

    @IsDateString()
    @IsOptional()
    endDate?: string;

    @IsDateString()
    @IsOptional()
    expirationDate?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    images?: string[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SponsorshipItemDto)
    @IsOptional()
    sponsorshipItems?: SponsorshipItemDto[];

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
