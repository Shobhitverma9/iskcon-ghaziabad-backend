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
  ) { }

  async findAll(period?: string): Promise<Donation[]> {
    const filter = this.getDateFilterForPeriod(period);
    return this.donationModel.find(filter).sort({ createdAt: -1 }).exec()
  }

  private getDateFilterForPeriod(period?: string): any {
    if (!period || period === 'all') {
      return {};
    }

    const now = new Date();
    let startDate: Date;

    if (period === 'monthly') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
    } else if (period === 'yearly') {
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // Last 365 days
    } else {
      return {};
    }

    return { createdAt: { $gte: startDate } };
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

    // Generate receipt number if completed
    if (savedDonation.status === 'completed' && !savedDonation.receiptNumber) {
      // We need a way to generate receipt number. 
      // Currently it seems the schema has it but no explicit generator in this file shown in previous turn.
      // I'll assume we might need to add one or it's handled elsewhere?
      // Wait, the user wants "receipts number generated".
      // Let's add a simple generator here for now or use existing if any.
      // Checking schema: @Prop({ unique: true, sparse: true }) receiptNumber: string

      // Let's generate a simple one: FY-SEQ (e.g. 2024-0001)
      // For now, I will just leave it to be generated or updated later, OR implement a simple generator.

      // IMPLEMENTATION OF RECEIPT GENERATION
      const date = new Date();
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const fy = month >= 4 ? `${year}-${(year + 1).toString().slice(-2)}` : `${year - 1}-${year.toString().slice(-2)}`;

      // Find last receipt number for this FY to increment
      // usage a regex or just simple count for now.
      const count = await this.donationModel.countDocuments({
        receiptNumber: { $regex: new RegExp(`^ISK/${fy}/`) }
      }) + 1;

      savedDonation.receiptNumber = `ISK/${fy}/${count.toString().padStart(4, '0')}`;
      await savedDonation.save();
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

  async getStats(): Promise<any> {
    const cacheKey = "donation:stats"
    const cached = await this.cacheManager.get(cacheKey)

    if (cached) {
      return cached
    }

    const stats = await this.donationModel.aggregate([
      { $match: { status: "completed" } },
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



    // Get Active Now (Users active in last 1 hour + recent donations)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const activeUsersCount = await this.userModel.countDocuments({ updatedAt: { $gte: oneHourAgo } });

    // Also count recent donations as activity
    const recentDonationsCount = await this.donationModel.countDocuments({ createdAt: { $gte: oneHourAgo } });

    const result = stats[0] || { totalDonations: 0, totalDonors: 0, averageDonation: 0 }

    // Add active count to result
    result.activeNow = activeUsersCount + recentDonationsCount;

    await this.cacheManager.set(cacheKey, result, 60000) // 1 minute (shorter cache for live stats)

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

  async getDonorAnalytics(period?: string): Promise<any[]> {
    const dateFilter = this.getDateFilterForPeriod(period);
    const matchStage: any = { status: 'completed', ...dateFilter };

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
          let: { userId: '$user._id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$userId', { $toString: '$$userId' }] },
                    { $eq: ['$status', 'active'] }
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

  // Details helper for email/receipt
  private getDonationDetailsString(donation: Donation, hasPan: boolean = false): string {
    return `
      Donation Amount: ₹${donation.amount}
      Date: ${new Date(donation.createdAt).toLocaleDateString()}
      Transaction ID: ${donation.transactionId || 'N/A'}
      Type: ${donation.type}
      80G Eligible: ${hasPan ? 'Yes' : 'No'}
    `;
  }

  // Mock Receipt Generation
  private async generateReceipt(donation: Donation, hasPan: boolean): Promise<any> {
    // MOCK: Return a simple buffer or object representing a PDF
    // In real implementation this would use Puppeteer to generate PDF
    const content = `Receipt for Donation ${donation._id}\n(80G Benefit: ${hasPan ? 'APPLICABLE' : 'N/A'})\n${this.getDonationDetailsString(donation, hasPan)}`;
    return Buffer.from(content, 'utf-8');
  }

  async resendReceipt(id: string): Promise<void> {
    const donation = await this.findById(id);
    if (!donation) {
      throw new Error('Donation not found');
    }

    let hasPan = false;
    if (donation.userId) {
      const user = await this.userModel.findById(donation.userId);
      if (user && user.pan) {
        hasPan = true;
      }
    }

    await this.sendDonationNotifications(donation, hasPan);
  }

  private async sendDonationNotifications(donation: Donation, hasPan: boolean = false) {
    const receiptBuffer = await this.generateReceipt(donation, hasPan);
    // const details = this.getDonationDetailsString(donation, hasPan); // Unused

    // 1. Email
    if (donation.donorEmail) {
      const isSubscription = !!donation.razorpaySubscriptionId;
      const subject = isSubscription
        ? `Hare Krishna! Welcome to Nitya Seva Family 🙏`
        : (hasPan ? "Thank you for your donation! (80G Receipt)" : "Thank you for your donation!");

      const title = isSubscription ? "Welcome to Nitya Seva" : "Thank You For Your Offering";
      const message = isSubscription
        ? `We are deeply honored to have you as a regular <strong>Nitya Sevak</strong>. Your monthly commitment of <strong>₹${donation.amount}</strong> to <strong>${donation.category}</strong> ensures that the service of Their Lordships continues uninterrupted.`
        : `We have received your generous offering of <strong>₹${donation.amount}</strong> for <strong>${donation.category}</strong>. Your contribution brings us closer to our mission of serving humanity and spreading love for Krishna.`;

      const htmlBody = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 15px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
            <div style="background: linear-gradient(135deg, #8E1B3A 0%, #D1440C 100%); padding: 40px 20px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 28px; letter-spacing: 1px;">Hare Krishna!</h1>
                <p style="margin: 10px 0 0; opacity: 0.9; font-size: 18px;">${title}</p>
            </div>
            
            <div style="padding: 40px 30px; line-height: 1.7;">
                <p style="font-size: 18px; color: #8E1B3A; font-weight: bold;">Dear ${donation.donorName || 'Devotee'},</p>
                
                <p>Please accept our humble obeisances. All glories to Srila Prabhupada.</p>
                
                <p style="font-size: 16px;">${message}</p>
                
                <div style="background-color: #FFF9F2; border-left: 4px solid #D1440C; padding: 20px; margin: 30px 0; border-radius: 0 10px 10px 0;">
                    <p style="margin: 0; color: #555; font-style: italic; font-size: 14px;">
                        "Whatever you do, whatever you eat, whatever you offer or give away, and whatever austerities you perform—do that, O son of Kuntī, as an offering to Me."<br>
                        <strong style="color: #D1440C;">— Bhagavad Gita 9.27</strong>
                    </p>
                </div>

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                    <tr>
                        <td style="padding: 10px 0; color: #777; font-size: 14px; text-transform: uppercase; font-weight: bold;">Amount</td>
                        <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #8E1B3A; font-size: 18px;">₹${donation.amount}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; color: #777; font-size: 14px; text-transform: uppercase; font-weight: bold;">Date</td>
                        <td style="padding: 10px 0; text-align: right;">${new Date(donation.createdAt).toLocaleDateString()}</td>
                    </tr>
                    ${donation.transactionId ? `
                    <tr>
                        <td style="padding: 10px 0; color: #777; font-size: 14px; text-transform: uppercase; font-weight: bold;">Transaction ID</td>
                        <td style="padding: 10px 0; text-align: right; font-family: monospace; font-size: 12px;">${donation.transactionId}</td>
                    </tr>` : ''}
                </table>

                ${hasPan ? `
                <div style="background-color: #E6F4EA; color: #1E8E3E; padding: 15px; border-radius: 10px; text-align: center; font-weight: bold; margin-bottom: 30px;">
                    ✅ Your 80G Tax Exemption Receipt is attached.
                </div>
                ` : `
                <div style="background-color: #F8F9FA; border: 1px dashed #DDD; padding: 15px; border-radius: 10px; text-align: center; font-size: 12px; color: #666; margin-bottom: 30px;">
                    Note: Please find your confirmation receipt attached. Update your profile with PAN card to receive 80G tax benefits.
                </div>
                `}

                <div style="text-align: center; border-top: 1px solid #EEE; pt-30; margin-top: 30px; padding-top: 30px;">
                    <p style="margin: 0; font-weight: bold; color: #D1440C;">Chant and Be Happy</p>
                    <p style="margin: 5px 0 0; color: #8E1B3A; font-weight: bold;">Hare Krishna Hare Krishna Krishna Krishna Hare Hare<br>Hare Rama Hare Rama Rama Rama Hare Hare</p>
                </div>
            </div>

            <div style="background-color: #F8F9FA; padding: 20px; text-align: center; border-top: 1px solid #EEE; color: #999; font-size: 12px;">
                <p style="margin: 0;">© ${new Date().getFullYear()} ISKCON Ghaziabad. All rights reserved.</p>
                <p style="margin: 5px 0 0;">Sector 7, Raj Nagar, Ghaziabad, Uttar Pradesh 201002</p>
            </div>
        </div>
      `;

      const attachments = [{
        "Name": `Receipt-${donation._id}.txt`, // MOCK .txt for now, change to .pdf later
        "Content": receiptBuffer.toString('base64'),
        "ContentType": "text/plain" // MOCK
      }];

      await this.notificationService.sendEmail(donation.donorEmail, subject, htmlBody, undefined, attachments);
    }

    // 2. SMS (Mock)
    if (donation.donorPhone) {
      await this.notificationService.sendSms(donation.donorPhone, `Hare Krishna! Thank you for your donation of Rs. ${donation.amount}. Receipt sent to email.`);
    }

    // 3. WhatsApp (Mock)
    if (donation.donorPhone) {
      // If hasPan, ideally message implies 80G receipt
      const msg = hasPan
        ? `Hare Krishna! Thank you for your donation of Rs. ${donation.amount}. Your 80G Receipt has been sent to your email.`
        : `Hare Krishna! Thank you for your donation of Rs. ${donation.amount}. Receipt sent to email.`;

      await this.notificationService.sendWhatsapp(donation.donorPhone, msg);
    }
  }
}
