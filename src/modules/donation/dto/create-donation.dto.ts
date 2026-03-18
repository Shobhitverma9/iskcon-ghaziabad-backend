import { IsString, IsEmail, IsNumber, IsOptional, Min } from "class-validator"

export class CreateDonationDto {
  @IsString()
  donorName: string

  @IsEmail()
  donorEmail: string

  @IsString()
  donorPhone: string

  @IsOptional()
  @IsString()
  pan?: string

  @IsNumber()
  @Min(100)
  amount: number

  @IsNumber()
  fundId: number

  @IsOptional()
  @IsString()
  address?: string

  @IsOptional()
  @IsString()
  city?: string

  @IsOptional()
  @IsString()
  state?: string

  @IsOptional()
  @IsString()
  pincode?: string

  @IsOptional()
  @IsString()
  userId?: string

  @IsOptional()
  @IsString()
  type?: string

  @IsOptional()
  @IsString()
  category?: string

  @IsOptional()
  @IsString()
  status?: string

  @IsOptional()
  @IsString()
  transactionId?: string

  @IsOptional()
  createdAt?: string
}
