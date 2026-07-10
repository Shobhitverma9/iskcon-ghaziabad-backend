import { IsString, IsEmail, IsNumber, IsOptional, Min, IsObject } from "class-validator"

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
  @Min(1)
  amount: number

  @IsOptional()
  @IsNumber()
  fundId?: number

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
  @IsString()
  razorpayOrderId?: string

  @IsOptional()
  @IsString()
  receiptNumber?: string

  @IsOptional()
  @IsString()
  paymentStatus?: string

  @IsOptional()
  createdAt?: string

  @IsOptional()
  @IsString()
  paymentMode?: string

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>
}
