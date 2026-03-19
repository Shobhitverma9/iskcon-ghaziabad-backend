import { IsString, IsOptional, IsNumber, IsUrl, IsBoolean } from "class-validator"

export class CreateCategoryDto {
    @IsString()
    title: string

    @IsString()
    slug: string

    @IsOptional()
    @IsString()
    description?: string

    @IsOptional()
    @IsString()
    image?: string

    @IsOptional()
    @IsNumber()
    order?: number

    @IsOptional()
    @IsBoolean()
    isActive?: boolean
}
