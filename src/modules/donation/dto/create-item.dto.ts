import { IsString, IsOptional, IsNumber, IsBoolean, IsMongoId } from "class-validator"

export class CreateItemDto {
    @IsMongoId()
    category: string

    @IsString()
    title: string

    @IsOptional()
    @IsString()
    description?: string

    @IsOptional()
    @IsString()
    subCategory?: string

    @IsOptional()
    @IsString()
    image?: string

    @IsOptional()
    @IsNumber()
    defaultAmount?: number

    @IsOptional()
    @IsBoolean()
    isCustomAmount?: boolean

    @IsOptional()
    @IsBoolean()
    isActive?: boolean
}
