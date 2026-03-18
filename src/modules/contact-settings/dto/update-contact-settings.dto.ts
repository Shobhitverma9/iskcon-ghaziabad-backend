
import { IsString, IsOptional, IsEmail, IsUrl } from "class-validator"

export class UpdateContactSettingsDto {
    @IsString()
    @IsOptional()
    templeName?: string

    @IsString()
    @IsOptional()
    address?: string

    @IsString()
    @IsOptional()
    googleMapsLink?: string

    @IsString()
    @IsOptional()
    googleMapsEmbedUrl?: string

    @IsEmail()
    @IsOptional()
    email?: string

    @IsString()
    @IsOptional()
    phone1?: string

    @IsString()
    @IsOptional()
    phone2?: string

    @IsString()
    @IsOptional()
    morningTimings?: string

    @IsString()
    @IsOptional()
    eveningTimings?: string

    @IsString()
    @IsOptional()
    facebook?: string

    @IsString()
    @IsOptional()
    instagram?: string

    @IsString()
    @IsOptional()
    youtube?: string

    @IsString()
    @IsOptional()
    twitter?: string

    @IsString()
    @IsOptional()
    whatsapp?: string
}
