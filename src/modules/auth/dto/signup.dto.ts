import { IsEmail, IsNotEmpty, IsString, MinLength, Matches, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class SignupDto {
    @IsEmail({}, { message: 'Please provide a valid email address' })
    @IsNotEmpty({ message: 'Email is required' })
    email: string;

    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    @IsNotEmpty({ message: 'Password is required' })
    password: string;

    @IsString()
    @IsNotEmpty({ message: 'First name is required' })
    firstName: string;

    @IsString()
    @IsNotEmpty({ message: 'Last name is required' })
    lastName: string;

    @IsString()
    @Matches(/^[0-9]{10}$/, { message: 'Phone number must be 10 digits' })
    @IsNotEmpty({ message: 'Phone number is required' })
    phone: string;

    @IsString()
    @IsOptional()
    @Transform(({ value }) => value === "" ? undefined : value)
    @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, { message: 'Invalid PAN number format' })
    pan?: string;

    @IsOptional()
    dob?: Date;
}
