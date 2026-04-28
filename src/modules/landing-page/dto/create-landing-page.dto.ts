import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsObject, IsArray } from "class-validator"

export class CreateLandingPageDto {
    @IsString()
    @IsNotEmpty()
    title: string

    @IsString()
    @IsOptional()
    headerTitle?: string

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
        mobileBackgroundImage?: string
        title?: string
        subtitle?: string
        description?: string
        buttonText: string
        buttonScrollId?: string
        buttonLink?: string
        showHareKrishnaBadge?: boolean
        showSeparator?: boolean
    }

    @IsArray()
    @IsOptional()
    sections?: {
        type: 'stats' | 'content' | 'donation' | 'grid' | 'media' | 'custom_donation' | 'pooja_offerings' | 'separator' | 'pricing_tiers'
        content: any
    }[]
}
