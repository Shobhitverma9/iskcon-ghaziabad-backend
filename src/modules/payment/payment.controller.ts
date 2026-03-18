import {
    Controller,
    Post,
    Body,
    Headers,
    BadRequestException,
    Logger,
    RawBodyRequest,
    Req,
} from '@nestjs/common'
import { PaymentService } from './payment.service'
import { DonationService } from '../donation/donation.service'
import { PoojaService } from '../pooja/pooja.service'
import { ReceiptService } from '../receipt/receipt.service'
import { NotificationService } from '../notification/notification.service'
import { ConfigService } from '@nestjs/config'
import {
    CreateOrderDto,
    VerifyPaymentDto,
    CreateCustomerDto,
    CreatePlanDto,
    CreateSubscriptionDto,
} from './dto/payment.dto'

@Controller('payment')
export class PaymentController {
    private readonly logger = new Logger(PaymentController.name)

    constructor(
        private readonly configService: ConfigService,
        private readonly paymentService: PaymentService,
        private readonly donationService: DonationService,
        private readonly poojaService: PoojaService,
        private readonly receiptService: ReceiptService,
        private readonly notificationService: NotificationService,
    ) { }


    /**
     * Create a Razorpay Order for one-time payment
     */
    @Post('create-order')
    async createOrder(@Body() createOrderDto: CreateOrderDto) {
        try {
            const order = await this.paymentService.createOrder(createOrderDto)
            return {
                success: true,
                order,
            }
        } catch (error) {
            this.logger.error('Create order failed', error)
            throw new BadRequestException(error.message || 'Failed to create order')
        }
    }

    /**
     * Called when user dismisses/cancels Razorpay modal
     */
    @Post('cancel-donation')
    async cancelDonation(@Body() body: { donationId: string }) {
        try {
            const { donationId } = body
            if (!donationId) throw new BadRequestException('donationId is required')

            const donation = await this.donationService.findById(donationId)
            if (!donation) throw new BadRequestException('Donation not found')

            // Only process if still pending (not already completed)
            if ((donation as any).status !== 'pending') {
                return { success: true, message: 'Already processed' }
            }

            // Mark as failed
            await this.donationService.updateStatus(donationId, 'failed')
            this.logger.log(`Donation ${donationId} marked as cancelled by user`)

            const donorName = donation.donorName || 'Donor'
            const amount = donation.amount
            const category = (donation as any).category || 'General Donation'
            const donorPhone = donation.donorPhone
            const donorEmail = donation.donorEmail
            const donationPageUrl = await this.resolveDonationPageUrl(category)

            // 1. Email
            if (donorEmail) {
                await this.notificationService.sendCancellationEmail(donorEmail, donorName, amount, category, donationPageUrl)
                    .catch(err => this.logger.error(`Failed to send cancellation email to ${donorEmail}`, err))
            }

            // 2. WhatsApp
            if (donorPhone) {
                await this.notificationService.sendWhatsappCancelledPayment(donorPhone, donorName, amount, category, donationPageUrl)
                    .catch(err => this.logger.error(`Failed to send cancelled payment WhatsApp to ${donorPhone}`, err))
            }

            return { success: true }
        } catch (error) {
            this.logger.error('Cancel donation failed', error)
            throw new BadRequestException(error.message || 'Failed to cancel donation')
        }
    }

    /** Resolves the donation page URL from a category title */
    private async resolveDonationPageUrl(category: string): Promise<string> {
        const baseUrl = this.configService.get<string>('SITE_URL') || 'https://iskconghaziabad.com'
        let categoryPath = '/donate'
        try {
            const categoryDoc = await this.donationService.getCategoryByTitle(category)
            if (categoryDoc && categoryDoc.slug) {
                categoryPath = `/donate/${categoryDoc.slug}`
            }
        } catch (err) {
            this.logger.error(`Failed to fetch category slug for "${category}"`, err)
        }
        return `${baseUrl}${categoryPath}`
    }

    /**
     * Verify payment and update donation status
     */
    @Post('verify')
    async verifyPayment(@Body() verifyPaymentDto: VerifyPaymentDto) {
        try {
            const isValid = this.paymentService.verifyPaymentSignature(verifyPaymentDto)

            if (!isValid) {
                throw new BadRequestException('Invalid payment signature')
            }

            // Update donation status if donationId is provided
            if (verifyPaymentDto.donationId) {
                // Update donation with Razorpay details
                await this.donationService.updateDonationRazorpayDetails(
                    verifyPaymentDto.donationId,
                    verifyPaymentDto.razorpayOrderId,
                    verifyPaymentDto.razorpayPaymentId,
                    verifyPaymentDto.razorpaySignature,
                    'captured',
                    verifyPaymentDto.razorpaySubscriptionId
                )

                // Fire receipt generation + email + WhatsApp (non-blocking)
                this.receiptService.generateAndSendReceipt(verifyPaymentDto.donationId).catch(err => {
                    this.logger.error(`Failed to generate receipt for donation ${verifyPaymentDto.donationId}`, err)
                })
            } else if (verifyPaymentDto.poojaId) {
                // Update pooja booking with Razorpay details
                await this.poojaService.updatePoojaRazorpayDetails(
                    verifyPaymentDto.poojaId,
                    verifyPaymentDto.razorpayOrderId,
                    verifyPaymentDto.razorpayPaymentId,
                    verifyPaymentDto.razorpaySignature,
                    'captured'
                )
            }


            return {
                success: true,
                message: 'Payment verified successfully',
            }
        } catch (error) {
            this.logger.error('Payment verification failed', error)
            throw new BadRequestException(error.message || 'Payment verification failed')
        }
    }

    /**
     * Verify Subscription Payment (Manual Trigger)
     */
    @Post('verify-subscription')
    async verifySubscription(@Body() verifyDto: {
        razorpayPaymentId: string;
        razorpaySubscriptionId: string;
        razorpaySignature: string;
    }) {
        try {
            // Verify signature
            const isValid = this.paymentService.verifySubscriptionSignature(
                verifyDto.razorpaySubscriptionId,
                verifyDto.razorpayPaymentId,
                verifyDto.razorpaySignature
            );

            if (!isValid) {
                throw new BadRequestException('Invalid subscription signature');
            }

            // Create/Update Donation Record
            const donation = await this.donationService.processInitialSubscriptionPayment(
                verifyDto.razorpaySubscriptionId,
                verifyDto.razorpayPaymentId
            );

            // Generate and send receipt
            if (donation) {
                try {
                    await this.receiptService.generateAndSendReceipt(donation._id);
                    this.logger.log(`✅ Receipt generated for initial subscription payment ${donation._id}`);
                } catch (receiptError) {
                    this.logger.error(`Failed to generate receipt for initial subscription payment`, receiptError);
                }
            }

            return { success: true };

        } catch (error) {
            this.logger.error('Subscription verification failed', error);
            throw new BadRequestException(error.message || 'Verification failed');
        }
    }

    /**
     * Create a Razorpay Customer
     */
    @Post('create-customer')
    async createCustomer(@Body() createCustomerDto: CreateCustomerDto) {
        try {
            const customer = await this.paymentService.createCustomer(createCustomerDto)
            return {
                success: true,
                customer,
            }
        } catch (error) {
            this.logger.error('Create customer failed', error)
            throw new BadRequestException(error.message || 'Failed to create customer')
        }
    }

    /**
     * Create a Razorpay Plan
     */
    @Post('create-plan')
    async createPlan(@Body() createPlanDto: CreatePlanDto) {
        try {
            const plan = await this.paymentService.createPlan(createPlanDto)
            return {
                success: true,
                plan,
            }
        } catch (error) {
            this.logger.error('Create plan failed', error)
            throw new BadRequestException(error.message || 'Failed to create plan')
        }
    }

    /**
     * Create a Razorpay Subscription
     */
    @Post('create-subscription')
    async createSubscription(@Body() createSubscriptionDto: CreateSubscriptionDto) {
        try {
            const subscription = await this.paymentService.createSubscription(createSubscriptionDto)

            // Save subscription to database

            try {
                await this.donationService.createSubscription({
                    userId: createSubscriptionDto.userId,
                    razorpaySubscriptionId: (subscription as any).id,
                    razorpayPlanId: (subscription as any).plan_id || createSubscriptionDto.planId, // Use returned plan_id
                    status: 'created',
                    frequency: 'monthly',
                    amount: createSubscriptionDto.amount || 0,
                    category: createSubscriptionDto.category || createSubscriptionDto.notes?.fundName || 'Nitya Seva',
                    nextPaymentDate: new Date(),
                    metadata: createSubscriptionDto.notes
                });
            } catch (error) {
                this.logger.error('Failed to save subscription details', error);
            }

            return {
                success: true,
                subscription,
            }
        } catch (error) {
            this.logger.error('Create subscription failed', error)
            throw new BadRequestException(error.message || 'Failed to create subscription')
        }
    }

    /**
     * Razorpay Webhook Handler
     * Handles events: payment.captured, payment.failed, subscription.activated, subscription.charged, etc.
     */
    @Post('webhook')
    async handleWebhook(
        @Req() req: RawBodyRequest<Request>,
        @Headers('x-razorpay-signature') signature: string,
    ) {
        try {
            const rawBody = req.rawBody?.toString() || JSON.stringify(req.body)

            // Verify webhook signature
            const isValid = this.paymentService.verifyWebhookSignature(rawBody, signature)

            if (!isValid) {
                this.logger.warn('Invalid webhook signature')
                throw new BadRequestException('Invalid signature')
            }

            const event = JSON.parse(rawBody)
            this.logger.log(`Webhook received: ${event.event}`)

            // Handle different webhook events
            switch (event.event) {
                case 'payment.captured':
                    await this.handlePaymentCaptured(event.payload.payment.entity)
                    break

                case 'payment.failed':
                    await this.handlePaymentFailed(event.payload.payment.entity)
                    break

                case 'subscription.activated':
                    await this.handleSubscriptionActivated(event.payload.subscription.entity)
                    break

                case 'subscription.charged':
                    await this.handleSubscriptionCharged(event.payload.subscription.entity, event.payload.payment.entity)
                    break

                case 'subscription.halted':
                    await this.handleSubscriptionHalted(event.payload.subscription.entity)
                    break

                case 'subscription.cancelled':
                    await this.handleSubscriptionCancelled(event.payload.subscription.entity)
                    break

                default:
                    this.logger.log(`Unhandled webhook event: ${event.event}`)
            }

            return { success: true }
        } catch (error) {
            this.logger.error('Webhook processing failed', error)
            throw new BadRequestException('Webhook processing failed')
        }
    }

    /**
     * TEST ONLY: Manually trigger subscription charge
     * POST /api/payment/test-subscription-charge
     * Body: { "subscriptionId": "sub_XXX", "amount": 50000 }
     */
    @Post('test-subscription-charge')
    async testSubscriptionCharge(@Body() body: { subscriptionId: string, amount: number }) {
        try {
            const { subscriptionId, amount } = body;

            if (!subscriptionId || !amount) {
                throw new BadRequestException('subscriptionId and amount are required');
            }

            const testPaymentId = `pay_test_${Date.now()}`;

            this.logger.log(`[TEST] Processing subscription charge: ${subscriptionId}, Amount: ₹${amount / 100}`);

            await this.donationService.createSubscriptionDonation(subscriptionId, testPaymentId, amount);

            return {
                success: true,
                message: 'Test subscription charge processed',
                paymentId: testPaymentId,
                subscriptionId,
                amount: amount / 100
            };
        } catch (error) {
            this.logger.error('[TEST] Subscription charge failed', error);
            throw new BadRequestException(error.message || 'Failed to process test charge');
        }
    }

    // Webhook Event Handlers

    private async handlePaymentCaptured(payment: any) {
        this.logger.log(`Payment captured: ${payment.id}`)

        try {
            // Check for donation first
            const donation = await this.donationService.findDonationByRazorpayOrderId(payment.order_id)

            if (donation) {
                await this.donationService.updateDonationRazorpayDetails(
                    donation._id,
                    payment.order_id,
                    payment.id,
                    '',
                    'captured'
                )
                this.logger.log(`Donation ${donation._id} updated to captured`)

                // Generate and send receipt
                try {
                    await this.receiptService.generateAndSendReceipt(donation._id)
                    this.logger.log(`✅ Receipt generated for donation ${donation._id}`)
                } catch (receiptError) {
                    this.logger.error(`Failed to generate receipt for donation ${donation._id}`, receiptError)
                    // Don't fail the whole webhook - receipt can be regenerated manually
                }

                return;
            }

            // Check for pooja booking
            const pooja = await this.poojaService.findPoojaByRazorpayOrderId(payment.order_id)
            if (pooja) {
                await this.poojaService.updatePoojaRazorpayDetails(
                    (pooja as any)._id,
                    payment.order_id,
                    payment.id,
                    '',
                    'captured'
                )
                this.logger.log(`Pooja booking ${(pooja as any)._id} updated to captured`)
                return;
            }

            this.logger.warn(`No donation or pooja found for order: ${payment.order_id}`)
        } catch (error) {
            this.logger.error('Failed to handle payment.captured', error)
        }
    }

    private async handlePaymentFailed(payment: any) {
        this.logger.log(`Payment failed: ${payment.id}`)

        try {
            // Check for donation
            const donation = await this.donationService.findDonationByRazorpayOrderId(payment.order_id)

            if (donation) {
                await this.donationService.updateDonationRazorpayDetails(
                    donation._id,
                    payment.order_id,
                    payment.id,
                    '',
                    'failed'
                )
                this.logger.log(`Donation ${donation._id} marked as failed: ${payment.error_description}`)

                // Notify donor: email + WhatsApp
                const donorName = donation.donorName || 'Donor';
                const amount = donation.amount;
                const category = donation.category || 'General Donation';
                const donorPhone = donation.donorPhone;
                const donorEmail = donation.donorEmail;
                const donationPageUrl = await this.resolveDonationPageUrl(category);

                // 1. Email to donor
                if (donorEmail) {
                    await this.notificationService.sendCancellationEmail(donorEmail, donorName, amount, category, donationPageUrl)
                        .catch(err => this.logger.error(`Failed to send failure email to ${donorEmail}`, err));
                }

                // 2. WhatsApp (cancelled_payment template) to donor
                if (donorPhone) {
                    await this.notificationService.sendWhatsappCancelledPayment(donorPhone, donorName, amount, category, donationPageUrl)
                        .catch(err => this.logger.error(`Failed to send WhatsApp failure to ${donorPhone}`, err));
                }

                // 3. Admin plain text alert
                const adminPhone = '919217640062';
                const adminMsg = `🚨 *Payment Alert*: Donation failed!\nDonor: ${donorName}\nAmount: ₹${amount}\nCategory: ${category}\nPhone: ${donorPhone || 'N/A'}\nError: ${payment.error_description || 'Unknown error'}`;
                await this.notificationService.sendWhatsapp(adminPhone, adminMsg).catch(err =>
                    this.logger.error(`Failed to send payment failure WhatsApp to admin`, err)
                );

                return;
            }

            // Check for pooja
            const pooja = await this.poojaService.findPoojaByRazorpayOrderId(payment.order_id)
            if (pooja) {
                await this.poojaService.updatePoojaRazorpayDetails(
                    (pooja as any)._id,
                    payment.order_id,
                    payment.id,
                    '',
                    'failed'
                )
                this.logger.log(`Pooja booking ${(pooja as any)._id} marked as failed`)
                return;
            }
        } catch (error) {
            this.logger.error('Failed to handle payment.failed', error)
        }
    }

    private async handleSubscriptionActivated(subscription: any) {
        this.logger.log(`Subscription activated: ${subscription.id}`)

        try {
            await this.donationService.updateSubscriptionRazorpayStatus(
                subscription.id,
                'active'
            )
            this.logger.log(`Subscription ${subscription.id} activated`)
        } catch (error) {
            this.logger.error('Failed to handle subscription.activated', error)
        }
    }

    private async handleSubscriptionCharged(subscription: any, payment: any) {
        this.logger.log(`Subscription charged: ${subscription.id}, Payment: ${payment.id}`)

        try {
            const sub = await this.donationService.findSubscriptionByRazorpayId(subscription.id)

            if (sub) {
                // Log successful recurring payment
                this.logger.log(`Recurring payment successful for subscription ${subscription.id}: ₹${payment.amount / 100}`)

                // Create a donation record for this successful charge
                const donation = await this.donationService.createSubscriptionDonation(subscription.id, payment.id, payment.amount)

                // Generate receipt
                if (donation) {
                    try {
                        await this.receiptService.generateAndSendReceipt(donation._id)
                        this.logger.log(`✅ Receipt generated for subscription donation ${donation._id}`)
                    } catch (receiptError) {
                        this.logger.error(`Failed to generate receipt for subscription charge`, receiptError)
                    }
                }
            }
        } catch (error) {
            this.logger.error('Failed to handle subscription.charged', error)
        }
    }

    private async handleSubscriptionHalted(subscription: any) {
        this.logger.log(`Subscription halted: ${subscription.id}`)

        try {
            await this.donationService.updateSubscriptionRazorpayStatus(
                subscription.id,
                'halted'
            )
            this.logger.log(`Subscription ${subscription.id} halted due to payment failures`)
        } catch (error) {
            this.logger.error('Failed to handle subscription.halted', error)
        }
    }

    private async handleSubscriptionCancelled(subscription: any) {
        this.logger.log(`Subscription cancelled: ${subscription.id}`)

        try {
            await this.donationService.updateSubscriptionRazorpayStatus(
                subscription.id,
                'cancelled'
            )
            this.logger.log(`Subscription ${subscription.id} cancelled`)
        } catch (error) {
            this.logger.error('Failed to handle subscription.cancelled', error)
        }
    }
}
