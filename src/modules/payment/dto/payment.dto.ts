import { IsNumber, IsString, IsOptional, IsEnum, IsObject } from 'class-validator'

export class CreateOrderDto {
    @IsNumber()
    amount: number

    @IsString()
    @IsOptional()
    currency?: string = 'INR'

    @IsString()
    @IsOptional()
    receipt?: string

    @IsObject()
    @IsOptional()
    notes?: Record<string, any>
}

export class VerifyPaymentDto {
    @IsString()
    @IsOptional()
    razorpayOrderId?: string

    @IsString()
    @IsOptional()
    razorpaySubscriptionId?: string

    @IsString()
    razorpayPaymentId: string

    @IsString()
    razorpaySignature: string

    @IsString()
    @IsOptional()
    donationId?: string

    @IsString()
    @IsOptional()
    poojaId?: string
}

export class CreateCustomerDto {
    @IsString()
    name: string

    @IsString()
    email: string

    @IsString()
    contact: string

    @IsObject()
    @IsOptional()
    notes?: Record<string, any>
}

export class CreatePlanDto {
    @IsNumber()
    amount: number

    @IsString()
    @IsEnum(['daily', 'weekly', 'monthly', 'yearly'])
    period: string

    @IsNumber()
    interval: number = 1

    @IsString()
    @IsOptional()
    currency?: string = 'INR'

    @IsString()
    @IsOptional()
    name?: string

    @IsString()
    @IsOptional()
    description?: string

    @IsObject()
    @IsOptional()
    notes?: Record<string, any>
}

export class CreateSubscriptionDto {
    @IsString()
    planId: string

    @IsString()
    customerId: string

    @IsNumber()
    @IsOptional()
    totalCount?: number = 0 // 0 means infinite

    @IsNumber()
    @IsOptional()
    customerNotify?: number = 1

    @IsNumber()
    @IsOptional()
    quantity?: number = 1

    @IsNumber()
    @IsOptional()
    amount?: number

    @IsObject()
    @IsOptional()
    notes?: Record<string, any>

    @IsString()
    @IsOptional()
    userId?: string

    @IsString()
    @IsOptional()
    category?: string
}
