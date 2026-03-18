import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsArray } from "class-validator"

export enum DarshanType {
    SRINGAR = "Sringar",
    MANGLA = "Mangla",
    FESTIVAL = "Festival",
    RAJ_BHOGA = "Raj Bhoga",
    SANDHYA = "Sandhya",
}

export class CreateDarshanDto {
    @IsDateString()
    @IsNotEmpty()
    date: string

    @IsEnum(DarshanType)
    @IsNotEmpty()
    type: DarshanType

    @IsArray()
    @IsString({ each: true })
    @IsNotEmpty()
    images: string[]
}

export class GetDarshanDto {
    @IsDateString()
    @IsOptional()
    date?: string

    @IsEnum(DarshanType)
    @IsOptional()
    type?: DarshanType
}
