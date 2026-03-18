import { IsString, IsEmail, IsNotEmpty, IsDateString, IsOptional, IsNumber, IsMongoId } from 'class-validator';

export class CreatePoojaDto {
    @IsNotEmpty()
    @IsString()
    devoteeName: string;

    @IsOptional()
    @IsEmail()
    devoteEmail?: string;

    @IsNotEmpty()
    @IsString()
    devotePhone: string;

    @IsOptional()
    @IsString()
    houseNo?: string;

    @IsOptional()
    @IsString()
    street?: string;

    @IsOptional()
    @IsString()
    city?: string;

    @IsOptional()
    @IsString()
    state?: string;

    @IsOptional()
    @IsString()
    country?: string;

    @IsOptional()
    @IsString()
    pinCode?: string;

    @IsOptional()
    @IsString()
    gotra?: string;

    @IsNotEmpty()
    @IsString()
    poojaType: string;

    @IsOptional()
    @IsString()
    attendanceMode?: string;

    @IsNotEmpty()
    @IsDateString()
    poojaDate: Date;

    @IsNotEmpty()
    @IsNumber()
    amount: number;

    @IsOptional()
    @IsString()
    specialRequests?: string;

    @IsOptional()
    @IsString()
    prasadamDelivery?: string;

    @IsOptional()
    @IsString()
    query?: string;

    @IsOptional()
    @IsMongoId()
    userId?: string;

    @IsOptional()
    items?: string[];
}
