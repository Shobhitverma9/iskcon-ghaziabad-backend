import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsObject, IsArray } from "class-validator"

export class CreateLandingPageDto {
    @IsString()
    @IsNotEmpty()
    title: string

    @IsString()
    @IsNotEmpty()
    slug: string

    @IsBoolean()
    @IsOptional()
    isActive?: boolean

    @IsObject()
    @IsNotEmpty()
    hero: {
        backgroundImage: string
        buttonText: string
        buttonScrollId?: string
    }

    @IsArray()
    @IsOptional()
    sections?: {
        type: 'stats' | 'content' | 'donation' | 'grid' | 'media' | 'custom_donation'
        content: any
    }[]
}
