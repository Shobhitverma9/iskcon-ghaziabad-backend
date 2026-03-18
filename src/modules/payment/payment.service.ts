import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Razorpay from 'razorpay'
import * as crypto from 'crypto'
import {
    CreateOrderDto,
    VerifyPaymentDto,
    CreateCustomerDto,
    CreatePlanDto,
    CreateSubscriptionDto,
} from './dto/payment.dto'

@Injectable()
export class PaymentService {
    private readonly logger = new Logger(PaymentService.name)
    private razorpay: Razorpay

    constructor(private configService: ConfigService) {
        const keyId = this.configService.get<string>('RAZORPAY_KEY_ID')
        const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET')

        if (!keyId || !keySecret) {
            this.logger.warn('Razorpay credentials not configured. Payment features will be disabled.')
        } else {
            this.razorpay = new Razorpay({
                key_id: keyId,
                key_secret: keySecret,
            })
            this.logger.log('Razorpay SDK initialized successfully')
        }
    }

    /**
     * Create a Razorpay Order for one-time payment
     */
    async createOrder(createOrderDto: CreateOrderDto): Promise<any> {
        try {
            const options = {
                amount: createOrderDto.amount * 100, // Convert to paise
                currency: createOrderDto.currency || 'INR',
                receipt: createOrderDto.receipt || `receipt_${Date.now()}`,
                notes: createOrderDto.notes || {},
            }

            const order = await this.razorpay.orders.create(options)
            this.logger.log(`Order created: ${order.id}`)
            return order
        } catch (error) {
            this.logger.error('Failed to create order', error)
            throw new BadRequestException('Failed to create payment order')
        }
    }

    /**
     * Verify payment signature
     */
    verifyPaymentSignature(verifyPaymentDto: VerifyPaymentDto): boolean {
        try {
            const { razorpayOrderId, razorpayPaymentId, razorpaySignature, razorpaySubscriptionId } = verifyPaymentDto
            const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET')

            let expectedSignatureString = ''
            if (razorpaySubscriptionId) {
                // Subscription verification: payment_id + | + subscription_id
                expectedSignatureString = `${razorpayPaymentId}|${razorpaySubscriptionId}`
            } else {
                // Order verification: order_id + | + payment_id
                expectedSignatureString = `${razorpayOrderId}|${razorpayPaymentId}`
            }

            const generatedSignature = crypto
                .createHmac('sha256', keySecret)
                .update(expectedSignatureString)
                .digest('hex')

            const isValid = generatedSignature === razorpaySignature
            this.logger.log(`Payment signature verification: ${isValid}`)
            return isValid
        } catch (error) {
            this.logger.error('Payment verification failed', error)
            return false
        }
    }

    verifySubscriptionSignature(subscriptionId: string, paymentId: string, signature: string): boolean {
        try {
            const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET')
            const expectedSignatureString = `${paymentId}|${subscriptionId}`

            const generatedSignature = crypto
                .createHmac('sha256', keySecret)
                .update(expectedSignatureString)
                .digest('hex')

            this.logger.log(`[VerifySub] PaymentID: ${paymentId}, SubID: ${subscriptionId}`)
            this.logger.log(`[VerifySub] Expected String: ${expectedSignatureString}`)
            this.logger.log(`[VerifySub] Generated: ${generatedSignature}, Received: ${signature}`)
            this.logger.log(`[VerifySub] Secret Length: ${keySecret?.length}`)

            return generatedSignature === signature
        } catch (error) {
            this.logger.error('Subscription verification failed', error)
            return false
        }
    }

    /**
     * Create a Razorpay Customer for eNACH
     */
    async createCustomer(createCustomerDto: CreateCustomerDto): Promise<any> {
        try {
            const customer = await this.razorpay.customers.create({
                name: createCustomerDto.name,
                email: createCustomerDto.email,
                contact: createCustomerDto.contact,
                notes: createCustomerDto.notes || {},
            })
            this.logger.log(`Customer created: ${customer.id}`)
            return customer
        } catch (error) {
            // Check if customer already exists
            if (error.error?.description?.includes('already exists') || error.message?.includes('already exists')) {
                this.logger.log(`Customer already exists, fetching existing record for ${createCustomerDto.email}`)
                try {
                    const customers: any = await this.razorpay.customers.all({
                        email: createCustomerDto.email,
                        count: 1
                    } as any)

                    if (customers.items && customers.items.length > 0) {
                        this.logger.log(`Existing customer found: ${customers.items[0].id}`)
                        return customers.items[0]
                    }
                } catch (fetchError) {
                    this.logger.error('Failed to fetch existing customer', fetchError)
                }
            }

            this.logger.error('Failed to create customer', error)
            throw new BadRequestException(error.error?.description || error.message || 'Failed to create customer')
        }
    }

    /**
     * Create a Razorpay Plan for recurring payments
     */
    async createPlan(createPlanDto: CreatePlanDto): Promise<any> {
        try {
            const plan = await this.razorpay.plans.create({
                period: createPlanDto.period as 'daily' | 'weekly' | 'monthly' | 'yearly',
                interval: createPlanDto.interval,
                item: {
                    name: createPlanDto.description || 'Nitya Seva Monthly Donation',
                    amount: createPlanDto.amount, // Already in paise from frontend
                    currency: createPlanDto.currency || 'INR',
                },
                notes: createPlanDto.notes || {},
            })
            this.logger.log(`Plan created: ${(plan as any).id}`)
            return plan
        } catch (error) {
            this.logger.error('Failed to create plan', error)
            throw new BadRequestException('Failed to create plan')
        }
    }

    /**
     * Create a Razorpay Subscription for eNACH
     */
    async createSubscription(createSubscriptionDto: CreateSubscriptionDto): Promise<any> {
        try {
            let planId = createSubscriptionDto.planId;

            // If no planId provided but amount is, try to find or create a plan
            if (!planId && createSubscriptionDto.amount) {
                // Determine period and interval
                // Default to monthly if not specified or implied
                const period = 'monthly';
                const interval = 1;

                // You might want to cache plans to avoid fetching every time
                // For now, let's create a specific plan name convention: "ISKCON_Monthly_{Amount}"
                // Ideally, fetch all plans and match, or just create a new one distinctively?
                // Razorpay allows creating plans. Duplicate plans with same details are just new plans.
                // Best practice: Store plans in DB or Cache. 
                // Quick fix: Create a new plan every time? No, that spams Razorpay.
                // Better: Create a plan with a descriptive name. 

                // Let's create a plan first. 
                const planName = `Nitya Seva - Monthly - ₹${createSubscriptionDto.amount / 100}`;
                const plan = await this.razorpay.plans.create({
                    period: period,
                    interval: interval,
                    item: {
                        name: planName,
                        amount: createSubscriptionDto.amount, // in paise
                        currency: 'INR',
                        description: 'Monthly Nitya Seva Donation'
                    }
                });

                planId = (plan as any).id;
                this.logger.log(`Created dynamic plan: ${planId} for amount ${createSubscriptionDto.amount}`);
            }

            if (!planId) {
                throw new BadRequestException('Plan ID or Amount is required');
            }

            // Calculate start_at (1 month from now) to avoid immediate double charge if we use add-on
            // OR if we want immediate charge via add-on + mandate.
            // Standard flow for "Immediate first payment":
            // 1. Add-on for the amount.
            // 2. start_at = now + 1 period.

            const now = new Date();
            const nextMonth = new Date(now);
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            // Razorpay expects unix timestamp in seconds
            const startAt = Math.floor(nextMonth.getTime() / 1000);

            const subscriptionPayload: any = {
                plan_id: planId,
                customer_notify: (createSubscriptionDto.customerNotify || 1) as 0 | 1,
                total_count: createSubscriptionDto.totalCount || 120, // Default to 10 years if 0/undefined
                notes: createSubscriptionDto.notes || {},
                start_at: startAt,
                addons: [
                    {
                        item: {
                            name: 'First Month Donation',
                            amount: createSubscriptionDto.amount,
                            currency: 'INR'
                        }
                    }
                ]
            };

            if (createSubscriptionDto.customerId) {
                subscriptionPayload.customer_id = createSubscriptionDto.customerId;
            }

            this.logger.debug(`Sending Subscription Payload to Razorpay: ${JSON.stringify(subscriptionPayload, null, 2)}`);

            const subscription = await this.razorpay.subscriptions.create(subscriptionPayload)
            this.logger.log(`Subscription created: ${(subscription as any).id} with immediate add-on charge of ${createSubscriptionDto.amount}`);

            // Attach planId to response if needed, or backend handling it is enough
            return {
                ...subscription,
                plan_id: planId // Ensure plan_id is returned
            };
        } catch (error) {
            this.logger.error('Failed to create subscription', error)
            throw new BadRequestException('Failed to create subscription')
        }
    }

    /**
     * Verify webhook signature
     */
    verifyWebhookSignature(payload: string, signature: string): boolean {
        try {
            const webhookSecret = this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET')

            if (!webhookSecret) {
                this.logger.warn('Webhook secret not configured')
                return false
            }

            const expectedSignature = crypto
                .createHmac('sha256', webhookSecret)
                .update(payload)
                .digest('hex')

            const isValid = expectedSignature === signature
            this.logger.log(`Webhook signature verification: ${isValid}`)
            return isValid
        } catch (error) {
            this.logger.error('Webhook verification failed', error)
            return false
        }
    }

    /**
     * Fetch payment details
     */
    async fetchPayment(paymentId: string): Promise<any> {
        try {
            const payment = await this.razorpay.payments.fetch(paymentId)
            return payment
        } catch (error) {
            this.logger.error(`Failed to fetch payment: ${paymentId}`, error)
            throw new BadRequestException('Failed to fetch payment details')
        }
    }

    /**
     * Fetch subscription details
     */
    async fetchSubscription(subscriptionId: string): Promise<any> {
        try {
            const subscription = await this.razorpay.subscriptions.fetch(subscriptionId)
            return subscription
        } catch (error) {
            this.logger.error(`Failed to fetch subscription: ${subscriptionId}`, error)
            throw new BadRequestException('Failed to fetch subscription details')
        }
    }

    /**
     * Cancel subscription
     */
    async cancelSubscription(subscriptionId: string): Promise<any> {
        try {
            const subscription = await this.razorpay.subscriptions.cancel(subscriptionId)
            this.logger.log(`Subscription cancelled: ${subscriptionId}`)
            return subscription
        } catch (error) {
            this.logger.error(`Failed to cancel subscription: ${subscriptionId}`, error)
            throw new BadRequestException('Failed to cancel subscription')
        }
    }
}
