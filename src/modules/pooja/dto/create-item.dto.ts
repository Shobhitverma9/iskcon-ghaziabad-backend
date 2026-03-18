import { IsString, IsNumber, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateItemDto {
    @IsNotEmpty()
    @IsString()
    title: string;

    @IsNotEmpty()
    @IsString()
    description: string;

    @IsNotEmpty()
    @IsNumber()
    price: number;

    @IsNotEmpty()
    @IsString()
    category: string;

    @IsOptional()
    @IsString()
    image?: string;

    @IsOptional()
    @IsString()
    type?: string;
}
