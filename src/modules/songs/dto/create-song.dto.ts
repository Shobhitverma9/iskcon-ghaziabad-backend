import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class LyricsDto {
    @IsOptional()
    @IsString()
    devanagari: string;

    @IsOptional()
    @IsString()
    iast: string;

    @IsOptional()
    @IsString()
    english: string;
}

export class CreateSongDto {
    @IsNotEmpty()
    @IsString()
    title: string;

    @IsNotEmpty()
    @IsString()
    author: string;

    @IsNotEmpty()
    @IsString()
    category: string;

    @IsNotEmpty()
    @IsString()
    audioUrl: string;

    @IsOptional()
    @IsString()
    slug?: string;

    @IsOptional()
    @ValidateNested()
    @Type(() => LyricsDto)
    lyrics: LyricsDto;

    @IsOptional()
    @IsNumber()
    duration: number;

    @IsOptional()
    @IsBoolean()
    isActive: boolean;
}
