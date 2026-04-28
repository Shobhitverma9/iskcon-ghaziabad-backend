import { Injectable, Inject, Logger } from "@nestjs/common"
import { InjectModel } from "@nestjs/mongoose"
import { CACHE_MANAGER } from "@nestjs/cache-manager"
import { Model } from "mongoose"
import type { Cache } from "cache-manager"
import { Donation, DonationDocument } from "./schemas/donation.schema"
import { DonationCategory, DonationCategoryDocument } from "./schemas/donation-category.schema"
import { DonationItem, DonationItemDocument } from "./schemas/donation-item.schema"
import { Certificate, CertificateDocument } from "./schemas/certificate.schema"
import { Subscription, SubscriptionDocument } from "./schemas/subscription.schema"
import type { CreateDonationDto } from "./dto/create-donation.dto"
import type { CreateCategoryDto } from "./dto/create-category.dto"
import type { CreateItemDto } from "./dto/create-item.dto"
import { NotificationService } from "../notification/notification.service"
import { User, UserDocument } from "../auth/schemas/user.schema"
import { ReceiptService } from "../receipt/receipt.service"

@Injectable()
export class DonationService {
  private readonly logger = new Logger(DonationService.name);

  constructor(
    @InjectModel(Donation.name) private donationModel: Model<DonationDocument>,
    @InjectModel(DonationCategory.name) private categoryModel: Model<DonationCategoryDocument>,
    @InjectModel(DonationItem.name) private itemModel: Model<DonationItemDocument>,
    @InjectModel(Certificate.name) private certificateModel: Model<CertificateDocument>,
    @InjectModel(Subscription.name) private subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly notificationService: NotificationService,
    @Inject(ReceiptService) private readonly receiptService: ReceiptService,
  ) { }

  async findAll(period?: string, startDate?: string, endDate?: string): Promise<Donation[]> {
    const filter = this.getDateFilterForPeriod(period, startDate, endDate);
    return this.donationModel.find(filter).sort({ createdAt: -1 }).exec()
  }

  private getDateFilterForPeriod(period?: string, startDate?: string, endDate?: string): any {
    const filter: any = { status: "completed" };

    if (startDate || endDate) {
      const dateRange: any = {};
      if (startDate) dateRange.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateRange.$lte = end;
      }
      filter.createdAt = dateRange;
      return filter;
    }

    if (!period || period === 'all') {
      return { status: "completed" };
    }

    const now = new Date();
    let start: Date;

    if (period === 'monthly') {
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
    } else if (period === 'yearly') {
      start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // Last 365 days
    } else {
      return { status: "completed" };
    }

    filter.createdAt = { $gte: start };
    return filter;
  }

  async create(createDonationDto: CreateDonationDto, ipAddress?: string): Promise<Donation> {
    let geoData = {};
    if (ipAddress) {
      geoData = await this.getGeoLocation(ipAddress);
    }

    const donation = new this.donationModel({
      ...createDonationDto,
      ipAddress,
      ...geoData
    })
    const savedDonation = await donation.save()

    // Invalidate cache
    await this.cacheManager.del("donation:stats")
    await this.cacheManager.del("donation:recent")
    await this.cacheManager.del("donation:analytics")



    // Note: Email notifications are sent after successful payment verification
    // in updateDonationRazorpayDetails() method

    return savedDonation
  }

  async createManual(createDonationDto: CreateDonationDto, userId: string): Promise<Donation> {
    const donation = new this.donationModel({
      ...createDonationDto,
      userId: createDonationDto.userId || userId, // Use provided userId or creator's id (though usually manual donations are for others)
      // If we are recording a donation for someone else, we might not have their userId.
      // So userId here is likely the admin who created it? No, usually userId links to donor.
      // If donor is not in system, userId is null.
      status: createDonationDto.status || 'completed', // Default to completed for manual entry
      paymentMethod: 'manual',
    })

    if (createDonationDto.createdAt) {
      donation.createdAt = new Date(createDonationDto.createdAt);
    }

    const savedDonation = await donation.save()

    // Trigger receipt generation and sending if completed
    if (savedDonation.status === 'completed') {
      try {
        // We use the ReceiptService to handle PDF generation, Cloudinary upload, and delivery.
        // If a receiptNumber was already provided (manual entry), ReceiptService's resend logic handles it.
        // Otherwise, it generates a new sequential number.
        if (savedDonation.receiptNumber) {
          this.receiptService.resendReceipt(savedDonation._id.toString()).catch(err =>
            this.logger.error(`❌ Manual receipt processing failed for ${savedDonation._id}: ${err.message}`)
          );
        } else {
          this.receiptService.generateAndSendReceipt(savedDonation._id.toString()).catch(err =>
            this.logger.error(`❌ Manual receipt generation failed for ${savedDonation._id}: ${err.message}`)
          );
        }
      } catch (error) {
        this.logger.error(`❌ Failed to trigger receipt service: ${error.message}`);
      }
    }

    // Invalidate cache
    await this.cacheManager.del("donation:stats")
    await this.cacheManager.del("donation:recent")
    await this.cacheManager.del("donation:all")

    return savedDonation
  }

  private async getGeoLocation(ip: string) {
    try {
      // Basic check to skip local/private IPs to avoid API errors
      if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
        return {};
      }

      const response = await fetch(`http://ip-api.com/json/${ip}`);
      const data = await response.json();

      if (data.status === 'success') {
        return {
          ipState: data.regionName,
          ipCity: data.city,
          ipCountry: data.country
        };
      }
    } catch (error) {
      this.logger.error('GeoIP lookup failed:', error);
    }
    return {};
  }

  async findById(id: string): Promise<Donation | null> {
    const cacheKey = `donation:${id}`
    const cached = await this.cacheManager.get<Donation>(cacheKey)

    if (cached) {
      return cached
    }

    const donation = await this.donationModel.findById(id).exec()

    if (donation) {
      await this.cacheManager.set(cacheKey, donation, 3600000) // 1 hour
    }

    return donation
  }

  async getStats(period?: string, startDate?: string, endDate?: string): Promise<any> {
    const cacheKey = `donation:stats:${period || 'all'}:${startDate || 'na'}:${endDate || 'na'}`
    const cached = await this.cacheManager.get(cacheKey)

    if (cached) {
      return cached
    }

    const filter = this.getDateFilterForPeriod(period, startDate, endDate);

    const stats = await this.donationModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalDonations: { $sum: "$amount" },
          uniqueDonorEmails: { $addToSet: "$donorEmail" },
          averageDonation: { $avg: "$amount" },
        },
      },
      {
        $project: {
          totalDonations: 1,
          totalDonors: { $size: "$uniqueDonorEmails" },
          averageDonation: 1,
        },
      },
    ])

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const activeUsersCount = await this.userModel.countDocuments({ updatedAt: { $gte: oneHourAgo } });
    const recentDonationsCount = await this.donationModel.countDocuments({ createdAt: { $gte: oneHourAgo } });

    const result = stats[0] || { totalDonations: 0, totalDonors: 0, averageDonation: 0 }
    result.activeNow = activeUsersCount + recentDonationsCount;

    await this.cacheManager.set(cacheKey, result, 60000)
    return result
  }

  async getAnalytics(): Promise<any> {
    const cacheKey = "donation:analytics"
    const cached = await this.cacheManager.get(cacheKey)

    if (cached) {
      return cached
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11); // Last 12 months including current

    // Parallel aggregation for better performance
    const [daily, monthly, yearly, byCategory, byType, byState] = await Promise.all([
      // Daily Stats (Last 30 Days)
      this.donationModel.aggregate([
        { $match: { status: "completed", createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            totalAmount: { $sum: "$amount" },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      // Monthly Stats (Last 12 Months)
      this.donationModel.aggregate([
        { $match: { status: "completed", createdAt: { $gte: twelveMonthsAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            totalAmount: { $sum: "$amount" },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      // Yearly Stats
      this.donationModel.aggregate([
        { $match: { status: "completed" } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y", date: "$createdAt" } },
            totalAmount: { $sum: "$amount" },
            count: { $sum: 1 }
          }
        }

      ]), // End Yearly Stats

      // By Donation Category (e.g. Anna Daan)
      this.donationModel.aggregate([
        { $match: { status: "completed" } },
        {
          $group: {
            _id: "$category", // Use updated category field
            value: { $sum: "$amount" },
            count: { $sum: 1 }
          }
        }
      ]),
      // By Frequency (e.g. One-time, Monthly)
      this.donationModel.aggregate([
        { $match: { status: "completed" } },
        {
          $group: {
            _id: "$type",
            value: { $sum: "$amount" },
            count: { $sum: 1 }
          }
        }
      ]),
      // By State (GeoIP)
      this.donationModel.aggregate([
        { $match: { status: "completed", ipState: { $exists: true, $ne: null } } },
        {
          $group: {
            _id: "$ipState",
            totalAmount: { $sum: "$amount" },
            count: { $sum: 1 }
          }
        },
        { $sort: { totalAmount: -1 } },
        { $limit: 10 }
      ])
    ]);

    // Fallback: If category is empty (old data), try to use 'type' if it looks like a category, or 'fundId' mapping
    const processedByCategory = byCategory.map(item => {
      if (!item._id) {
        // If _id is null, it might be old data. 
        // We can leave it as 'Unknown' or try to infer.
        return { ...item, _id: 'General' };
      }
      return item;
    });

    const result = { daily, monthly, yearly, byCategory: processedByCategory, byFrequency: byType, byState };
    await this.cacheManager.set(cacheKey, result, 3600000); // 1 hour
    return result;
  }

  async getDonorAnalytics(period?: string, startDate?: string, endDate?: string): Promise<any[]> {
    const dateFilter = this.getDateFilterForPeriod(period, startDate, endDate);
    const matchStage: any = { ...dateFilter };

    return this.donationModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $toLower: '$donorEmail' }, // Group by case-insensitive email
          email: { $first: '$donorEmail' },
          donorName: { $first: '$donorName' },
          donorPhone: { $first: '$donorPhone' },
          totalAmount: { $sum: '$amount' },
          donationCount: { $sum: 1 },
          lastDonationDate: { $max: '$createdAt' }
        }
      },
      // Lookup to find user by email
      {
        $lookup: {
          from: 'users',
          localField: 'email',
          foreignField: 'email',
          as: 'user'
        }
      },
      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true
        }
      },
      // Lookup active subscriptions for the user
      {
        $lookup: {
          from: 'subscriptions',
          let: { userId: '$user._id', donorEmail: '$email' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$status', 'active'] },
                    {
                      $or: [
                        { $eq: ['$userId', { $toString: '$$userId' }] },
                        { $eq: [{ $toLower: '$metadata.donorEmail' }, { $toLower: '$$donorEmail' }] }
                      ]
                    }
                  ]
                }
              }
            }
          ],
          as: 'activeSubscriptions'
        }
      },
      {
        $addFields: {
          activeSubscriptionCount: { $size: '$activeSubscriptions' }
        }
      },
      { $project: { user: 0, activeSubscriptions: 0 } }, // Cleanup
      { $sort: { totalAmount: -1 } }
    ]).exec();
  }

  async getRecent(limit = 10): Promise<Donation[]> {
    const cacheKey = `donation:recent:${limit}`
    const cached = await this.cacheManager.get<Donation[]>(cacheKey)

    if (cached) {
      return cached
    }

    const donations = await this.donationModel
      .find({ status: 'completed' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec()

    await this.cacheManager.set(cacheKey, donations, 1800000) // 30 mins

    return donations
  }

  async getTopDonors(limit = 20): Promise<any[]> {
    const cacheKey = `donation:top:${limit}`
    const cached = await this.cacheManager.get<any[]>(cacheKey)

    if (cached) {
      return cached
    }

    const topDonors = await this.donationModel.aggregate([
      { $match: { status: "completed" } },
      {
        $group: {
          _id: "$donorEmail",
          totalAmount: { $sum: "$amount" },
          name: { $first: "$donorName" },
          lastDonation: { $max: "$createdAt" }
        }
      },
      { $sort: { totalAmount: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          email: "$_id",
          name: 1,
          totalAmount: 1
        }
      }
    ])

    await this.cacheManager.set(cacheKey, topDonors, 3600000) // 1 hour

    return topDonors
  }

  async updateStatus(
    id: string,
    status: "pending" | "completed" | "failed",
    transactionId?: string,
  ): Promise<Donation | null> {
    const updateData: any = { status, updatedAt: new Date() }
    if (transactionId) {
      updateData.transactionId = transactionId
    }

    const updatedDonation = await this.donationModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).exec()

    await this.cacheManager.del(`donation:${id}`)
    await this.cacheManager.del("donation:stats")

    return updatedDonation
  }

  async findByUser(userId: string): Promise<Donation[]> {
    return this.donationModel.find({ userId }).sort({ createdAt: -1 }).exec()
  }

  // Certificates
  async getCertificates(userId: string): Promise<Certificate[]> {
    return this.certificateModel.find({ userId }).sort({ issuedDate: -1 }).exec()
  }

  // Subscriptions
  async getSubscriptions(userId: string): Promise<Subscription[]> {
    return this.subscriptionModel.find({ userId }).sort({ createdAt: -1 }).exec()
  }

  async cancelSubscription(id: string, userId: string): Promise<Subscription | null> {
    return this.subscriptionModel.findOneAndUpdate(
      { _id: id, userId },
      { status: 'cancelled' },
      { new: true }
    ).exec()
  }

  // Razorpay Integration Helpers
  async findDonationByRazorpayOrderId(razorpayOrderId: string): Promise<Donation | null> {
    return this.donationModel.findOne({ razorpayOrderId }).exec()
  }

  async updateDonationRazorpayDetails(
    donationId: string,
    razorpayOrderId: string | undefined,
    razorpayPaymentId: string,
    razorpaySignature: string,
    paymentStatus: string,
    razorpaySubscriptionId?: string
  ): Promise<Donation | null> {
    const updateData: any = {
      razorpayPaymentId,
      razorpaySignature,
      paymentStatus,
      status: paymentStatus === 'captured' ? 'completed' : 'failed',
      updatedAt: new Date()
    }

    if (razorpayOrderId) {
      updateData.razorpayOrderId = razorpayOrderId
    }

    if (razorpaySubscriptionId) {
      updateData.razorpaySubscriptionId = razorpaySubscriptionId
    }

    // Idempotency: If paymentStatus is captured, only update if status is NOT already completed
    const query: any = { _id: donationId }
    if (paymentStatus === 'captured') {
      query.status = { $ne: 'completed' }
    }

    let updatedDonation = await this.donationModel.findOneAndUpdate(
      query,
      updateData,
      { new: true }
    ).exec()

    if (!updatedDonation) {
      // If null, it means either not found OR already completed.
      // If already completed, we just return it without sending email again.
      const existing = await this.donationModel.findById(donationId).exec()
      if (existing && existing.status === 'completed' && paymentStatus === 'captured') {
        return existing
      }
      return null
    }

    if (updatedDonation.status === 'failed') {
      await this.handleFailedPayment(updatedDonation).catch(err =>
        this.logger.error('Failed to send failure notification', err)
      );
    }

    return updatedDonation
  }

  async findSubscriptionByRazorpayId(razorpaySubscriptionId: string): Promise<Subscription | null> {
    return this.subscriptionModel.findOne({ razorpaySubscriptionId }).exec()
  }

  async updateSubscriptionRazorpayStatus(
    razorpaySubscriptionId: string,
    razorpayStatus: string,
    status?: string
  ): Promise<Subscription | null> {
    const updateData: any = { razorpayStatus }

    // Map Razorpay status to our internal status
    if (status) {
      updateData.status = status
    } else if (razorpayStatus === 'active') {
      updateData.status = 'active'
    } else if (razorpayStatus === 'halted') {
      updateData.status = 'failed'
    } else if (razorpayStatus === 'cancelled') {
      updateData.status = 'cancelled'
    }

    return this.subscriptionModel.findOneAndUpdate(
      { razorpaySubscriptionId },
      updateData,
      { new: true }
    ).exec()
  }
  async createSubscription(data: Partial<Subscription>): Promise<Subscription> {
    const subscription = new this.subscriptionModel(data);
    return subscription.save();
  }

  async createSubscriptionDonation(subscriptionId: string, paymentId: string, amount: number): Promise<Donation | void> {
    const subscription = await this.subscriptionModel.findOne({ razorpaySubscriptionId: subscriptionId });
    if (!subscription) {
      this.logger.error(`Subscription not found for ID: ${subscriptionId}`);
      return;
    }

    // Check idempotency
    const existingDonation = await this.donationModel.findOne({ razorpayPaymentId: paymentId });
    if (existingDonation) return existingDonation;

    const donation = new this.donationModel({
      amount: amount / 100, // Amount is in paise
      donorName: subscription.metadata?.donorName || 'Subscriber',
      donorEmail: subscription.metadata?.donorEmail,
      donorPhone: subscription.metadata?.donorPhone,
      type: 'monthly', // Recurring
      category: subscription.category || 'General',
      status: 'completed',
      paymentMethod: 'razorpay',
      razorpayPaymentId: paymentId,
      razorpaySubscriptionId: subscriptionId,
      transactionId: paymentId,
      isAnonymous: false,
      userId: subscription.userId,
      fundId: 0 // Default for subscriptions if not mapped
    });

    const savedDonation = await donation.save();

    // Invalidate cache
    await this.cacheManager.del("donation:stats");
    await this.cacheManager.del("donation:all");

    // Mock notification removed - Receipt is now handled by PaymentController/ReceiptService

    return savedDonation;
  }


  async processInitialSubscriptionPayment(subscriptionId: string, paymentId: string): Promise<Donation> {
    const subscription = await this.subscriptionModel.findOne({ razorpaySubscriptionId: subscriptionId });
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Check if donation already exists for this payment
    const existingDonation = await this.donationModel.findOne({ razorpayPaymentId: paymentId });
    if (existingDonation) return existingDonation;

    // Fetch payment details from Razorpay to get accurate amount
    // Ideally we should inject Razorpay instance here or pass amount, but for now we can rely on plan amount or default
    // Or we can just create it with 0 amount and let webhook update it, BUT webhook is failing.
    // So better to set a default amount or fetch it. 
    // Let's assume the subscription amount or default to the plan amount if stored. 
    // Subscription schema has 'amount'.

    const donation = new this.donationModel({
      amount: subscription.amount > 0 ? (subscription.amount / 100) : 0, // Convert from paise to rupees
      donorName: subscription.metadata?.donorName || 'Subscriber',
      donorEmail: subscription.metadata?.donorEmail,
      donorPhone: subscription.metadata?.donorPhone,
      type: 'monthly',
      category: subscription.category || 'General',
      status: 'completed',
      paymentMethod: 'razorpay',
      razorpayPaymentId: paymentId,
      razorpaySubscriptionId: subscriptionId,
      transactionId: paymentId,
      isAnonymous: false,
      userId: subscription.userId,
      fundId: 0 // Default for subscriptions if not mapped
    });

    const savedDonation = await donation.save();

    // Mock notification removed - Receipt is now handled by PaymentController/ReceiptService

    // Immediately mark subscription as active
    subscription.status = 'active';
    subscription.razorpayStatus = 'active';
    await subscription.save();

    return savedDonation;
  }


  async handleAbandonedCheckout(data: any): Promise<void> {
    const { donorName, donorEmail, donorPhone, amount, category } = data;

    // 1. Email
    if (donorEmail) {
      const subject = "Hare Krishna! Need help with your donation?";
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; line-height: 1.6;">
            <div style="background-color: #fce7cf; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; border: 1px solid #ddd; border-bottom: none;">
                <h1 style="color: #d1440c; margin: 0; font-size: 28px;">Hare Krishna!</h1>
                <p style="color: #8E1B3A; font-weight: bold; margin-top: 10px; font-size: 18px;">ISKCON Ghaziabad</p>
            </div>
            <div style="padding: 30px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 12px 12px; background-color: #ffffff;">
                <p>Dear <strong>${donorName || 'Devotee'}</strong>,</p>
                <p>Please accept our humble obeisances. All glories to Srila Prabhupada.</p>
                
                <p>We noticed you were interested in supporting <strong>ISKCON Ghaziabad</strong>'s ${category || 'sacred mission'}. Your intention to contribute <strong>₹${amount}</strong> is deeply appreciated and will go a long way in serving the community and Their Lordships.</p>
                
                <div style="background-color: #f9f9f9; padding: 20px; border-left: 4px solid #d1440c; margin: 25px 0;">
                    <p style="margin: 0; font-style: italic; color: #555;">
                        "If one offers Me with love and devotion a leaf, a flower, fruit or water, I will accept it."
                        <br/>— <strong>Bhagavad Gita 9.26</strong>
                    </p>
                </div>

                <p>We noticed that the donation process wasn't completed. Is there anything we can help you with? If you faced any technical issues or have any questions, please simply reply to this email.</p>
                
                <div style="text-align: center; margin: 35px 0;">
                    <a href="https://iskconghaziabad.com/checkout?amount=${amount}&purpose=${encodeURIComponent(category || '')}" 
                       style="background-color: #8E1B3A; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        Complete My Offering
                    </a>
                </div>

                <p>Chant and be happy:</p>
                <p style="font-weight: bold; color: #d1440c; background-color: #fff9f2; padding: 15px; border-radius: 8px; text-align: center;">
                    Hare Krishna, Hare Krishna, Krishna Krishna, Hare Hare<br>
                    Hare Rama, Hare Rama, Rama Rama, Hare Hare
                </p>
                
                <br>
                <p style="margin-bottom: 0;">Your servants,<br><strong>ISKCON Ghaziabad Team</strong></p>
            </div>
            <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
                <p>© ${new Date().getFullYear()} ISKCON Ghaziabad. All rights reserved.</p>
            </div>
        </div>
      `;

      await this.notificationService.sendEmail(donorEmail, subject, htmlBody).catch(err =>
        this.logger.error('Abandoned checkout email failed', err)
      );
    }


    // 2. WhatsApp
    if (donorPhone) {
      const msg = `Hare Krishna! We noticed you started a donation for ${category || 'ISKCON Ghaziabad'}. Would you like to complete it now? Your support means a lot to us. Click here to continue: https://iskconghaziabad.com/checkout?amount=${amount}&purpose=${encodeURIComponent(category || '')} 🙏`;
      await this.notificationService.sendWhatsapp(donorPhone, msg).catch(err =>
        this.logger.error('Abandoned checkout WhatsApp failed', err)
      );
    }
  }

  async handleFailedPayment(donation: Donation): Promise<void> {
    if (donation.donorPhone) {
      const msg = `Hare Krishna ${donation.donorName}! 🙏 We noticed your donation of ₹${donation.amount} for ${donation.category || 'ISKCON Ghaziabad'} was unsuccessful. Don't worry, you can try again here: https://iskconghaziabad.com/checkout?id=${donation._id}. If you need any help, please let us know.`;
      await this.notificationService.sendWhatsapp(donation.donorPhone, msg).catch(err =>
        this.logger.error('Failed payment WhatsApp alert failed', err)
      );
    }
  }




  async getUniqueDonorPhoneNumbers(filter: any = {}): Promise<string[]> {
    const query: any = { donorPhone: { $exists: true, $ne: '' } };

    if (filter.status) {
      query.status = filter.status;
    }

    const phones = await this.donationModel.distinct('donorPhone', query).exec();
    return phones.filter(p => p && p.length >= 10); // Basic validation
  }

  async getFailedDonationsWithCheck(): Promise<any[]> {
    const failedDonations = await this.donationModel.find({
      status: 'failed',
      donorPhone: { $exists: true, $ne: '' }
    }).sort({ createdAt: -1 }).lean().exec();

    const results = await Promise.all(failedDonations.map(async (donation: any) => {
      const hasDonatedSince = await this.donationModel.exists({
        status: 'completed',
        $or: [
          { donorEmail: donation.donorEmail },
          { donorPhone: donation.donorPhone }
        ],
        createdAt: { $gt: donation.createdAt }
      });

      return {
        ...donation,
        hasDonatedSince: !!hasDonatedSince
      };
    }));

    return results;
  }

  async sendBulkWhatsapp(numbers: string[], message: string): Promise<{ success: number; failed: number }> {
    let successCount = 0;
    let failedCount = 0;

    for (const number of numbers) {
      try {
        await this.notificationService.sendWhatsapp(number, message);
        successCount++;
        // Small delay to avoid hitting rate limits too hard
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        this.logger.error(`Failed to send promotional WhatsApp to ${number}`, error);
        failedCount++;
      }
    }

    return { success: successCount, failed: failedCount };
  }


  // Categories
  async createCategory(createCategoryDto: CreateCategoryDto): Promise<DonationCategory> {
    const category = new this.categoryModel(createCategoryDto)
    const saved = await category.save()
    await this.cacheManager.del("donation:options:true")
    await this.cacheManager.del("donation:options:false")
    return saved
  }

  async getCategories(filter: any = {}): Promise<DonationCategory[]> {
    return this.categoryModel.find(filter).sort({ order: 1 }).exec()
  }

  async getCategoryByTitle(title: string): Promise<DonationCategory | null> {
    const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.categoryModel.findOne({
      title: { $regex: new RegExp(`^${escapedTitle}$`, 'i') }
    }).exec()
  }

  // Items
  async createItem(createItemDto: CreateItemDto): Promise<DonationItem> {
    const item = new this.itemModel(createItemDto)
    const saved = await item.save()
    await this.cacheManager.del("donation:options:true")
    await this.cacheManager.del("donation:options:false")
    return saved
  }

  async getItemsByCategory(categoryId: string): Promise<DonationItem[]> {
    return this.itemModel.find({ category: categoryId as any }).exec()
  }

  async getDonationOptions(filterActive: boolean = true): Promise<any[]> {
    const cacheKey = `donation:options:${filterActive}`
    const cached = await this.cacheManager.get<any[]>(cacheKey)
    if (cached) return cached

    // Build query based on filter
    const query = filterActive ? { isActive: true } : {};

    const categories = await this.categoryModel.find(query).sort({ order: 1 }).lean().exec()
    const options = await Promise.all(
      categories.map(async (cat: any) => {
        // Apply same filter to items
        const itemQuery = { category: cat._id, ...(filterActive ? { isActive: true } : {}) }
        const items = await this.itemModel.find(itemQuery).exec()
        return { ...cat, items }
      })
    )

    await this.cacheManager.set(cacheKey, options, 1800000) // 30 mins
    return options
  }

  // Category CRUD
  async updateCategory(id: string, updateData: any): Promise<DonationCategory | null> {
    const updated = await this.categoryModel.findByIdAndUpdate(id, updateData, { new: true }).exec()
    await this.cacheManager.del("donation:options:true")
    await this.cacheManager.del("donation:options:false")
    return updated
  }

  async deleteCategory(id: string): Promise<DonationCategory | null> {
    const deleted = await this.categoryModel.findByIdAndDelete(id).exec()
    await this.cacheManager.del("donation:options:true")
    await this.cacheManager.del("donation:options:false")
    return deleted
  }

  // Item CRUD
  async updateItem(id: string, updateData: any): Promise<DonationItem | null> {
    const updated = await this.itemModel.findByIdAndUpdate(id, updateData, { new: true }).exec()
    await this.cacheManager.del("donation:options:true")
    await this.cacheManager.del("donation:options:false")
    return updated
  }

  async deleteItem(id: string): Promise<DonationItem | null> {
    const deleted = await this.itemModel.findByIdAndDelete(id).exec()
    await this.cacheManager.del("donation:options:true")
    await this.cacheManager.del("donation:options:false")
    return deleted
  }

  async resendReceipt(id: string): Promise<void> {
    await this.receiptService.resendReceipt(id);
  }

  async processResendViaReceiptService(id: string): Promise<void> {
    await this.receiptService.resendReceipt(id);
  }
}
