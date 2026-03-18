import { IsDateString, IsNotEmpty, IsOptional, IsString, IsObject, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SponsorshipDetailDto {
    @IsString()
    @IsOptional()
    title: string;

    @IsString()
    @IsOptional()
    amount: string;

    @IsString()
    @IsOptional()
    description: string;
}

export class CreateCalendarEventDto {
    @IsDateString()
    @IsNotEmpty()
    date: string;

    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    location?: string;

    @IsString()
    @IsOptional()
    type?: string;

    @IsObject()
    @IsOptional()
    meta?: Record<string, any>;

    @IsString()
    @IsOptional()
    uid?: string;

    @IsString()
    @IsOptional()
    image?: string;

    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => SponsorshipDetailDto)
    sponsorshipDetails?: SponsorshipDetailDto[];
}
