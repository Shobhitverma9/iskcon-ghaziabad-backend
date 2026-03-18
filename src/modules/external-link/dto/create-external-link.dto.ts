import { IsString, IsUrl, IsDateString, IsOptional } from 'class-validator';

export class CreateExternalLinkDto {
    @IsUrl()
    url: string;

    @IsString()
    @IsOptional()
    title: string;

    @IsDateString()
    @IsOptional()
    publishedAt?: string;
}
