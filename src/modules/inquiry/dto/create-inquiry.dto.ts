import { IsString, IsEmail, IsOptional, IsNotEmpty } from "class-validator"

export class CreateInquiryDto {
    @IsString()
    @IsNotEmpty()
    name: string

    @IsEmail()
    @IsNotEmpty()
    email: string

    @IsString()
    @IsOptional()
    phone?: string

    @IsString()
    @IsOptional()
    address?: string

    @IsString()
    @IsOptional()
    details?: string

    @IsString()
    @IsNotEmpty()
    type: string

    @IsString()
    @IsOptional()
    specialNote?: string
}
