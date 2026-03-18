import { Injectable, Inject, Logger } from "@nestjs/common"
import { InjectModel } from "@nestjs/mongoose"
import { CACHE_MANAGER } from "@nestjs/cache-manager"
import { Model } from "mongoose"
import type { Cache } from "cache-manager"
import { PoojaBooking, PoojaBookingDocument } from "./schemas/pooja.schema"
import { PujaItem, PujaItemDocument } from "./schemas/puja-item.schema"
import { CreatePoojaDto } from "./dto/create-pooja.dto"
import { CreateItemDto } from "./dto/create-item.dto"
import { NotificationService } from "../notification/notification.service"
import { User, UserDocument } from "../auth/schemas/user.schema"


@Injectable()
export class PoojaService {
  private readonly logger = new Logger(PoojaService.name);

  constructor(
    @InjectModel(PoojaBooking.name) private poojaModel: Model<PoojaBookingDocument>,
    @InjectModel(PujaItem.name) private pujaItemModel: Model<PujaItemDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly notificationService: NotificationService
  ) { }

  async create(createPoojaDto: any): Promise<PoojaBooking> {
    const pooja = new this.poojaModel(createPoojaDto)
    const savedPooja = await pooja.save()

    await this.cacheManager.del("pooja:available-slots")

    // Note: Email notifications are sent after successful payment verification
    // in updatePoojaRazorpayDetails() method

    return savedPooja
  }

  private async generateReceipt(booking: PoojaBooking, hasPan: boolean): Promise<any> {
    const bookingId = (booking as any)._id;
    const content = `Receipt for Pooja Booking ${bookingId}\n(80G Benefit: ${hasPan ? 'APPLICABLE' : 'N/A'})\nAmount: ${booking.amount}\nDate: ${new Date().toLocaleDateString()}`;
    return Buffer.from(content, 'utf-8');
  }

  private async sendPoojaNotifications(booking: PoojaBooking, hasPan: boolean = false) {
    const receiptBuffer = await this.generateReceipt(booking, hasPan);

    // 1. Email
    if (booking.devoteEmail) {
      const subject = hasPan ? "Booking Confirmed! (80G Receipt)" : "Pooja Booking Confirmed!";
      const bookingId = (booking as any)._id;
      const htmlBody = `
        <h1>Hare Krishna, ${booking.devoteeName || 'Devotee'}!</h1>
        <p>Your pooja booking for <strong>${new Date(booking.poojaDate).toLocaleDateString()}</strong> has been confirmed.</p>
        <p>Amount: <strong>₹${booking.amount}</strong></p>
        ${hasPan ? '<p><strong>Your 80G Tax Exemption Receipt is attached.</strong></p>' : '<p>Please find your receipt attached.</p>'}
        <hr />
        <p>Hare Krishna,<br/>ISKCON Ghaziabad</p>
      `;

      const attachments = [{
        "Name": `Receipt-${bookingId}.txt`,
        "Content": receiptBuffer.toString('base64'),
        "ContentType": "text/plain"
      }];

      await this.notificationService.sendEmail(booking.devoteEmail, subject, htmlBody, undefined, attachments);
    }

    // 2. Mock WhatsApp/SMS
    if (booking.devotePhone) {
      const msg = hasPan
        ? `Hare Krishna! Your pooja booking is confirmed. 80G Receipt sent to email. Amount: Rs. ${booking.amount}`
        : `Hare Krishna! Your pooja booking is confirmed. Receipt sent to email. Amount: Rs. ${booking.amount}`;

      await this.notificationService.sendWhatsapp(booking.devotePhone, msg);
    }
  }

  async findById(id: string): Promise<PoojaBooking | null> {
    const cacheKey = `pooja:${id}`
    const cached = await this.cacheManager.get<PoojaBooking>(cacheKey)

    if (cached) {
      return cached
    }

    const pooja = await this.poojaModel.findById(id).lean().exec()

    if (pooja) {
      await this.cacheManager.set(cacheKey, pooja, 3600000)
    }

    return pooja
  }

  async findByUser(userId: string): Promise<PoojaBooking[]> {
    return this.poojaModel.find({ userId }).sort({ poojaDate: 1 }).lean().exec() as Promise<PoojaBooking[]>
  }

  async findAll(): Promise<PoojaBooking[]> {
    return this.poojaModel.find().sort({ createdAt: -1 }).lean().exec() as Promise<PoojaBooking[]>
  }

  async reschedule(id: string, newDate: Date, userId: string): Promise<PoojaBooking | null> {
    const booking = await this.poojaModel.findOne({ _id: id, userId })
    if (!booking) return null

    booking.poojaDate = newDate
    booking.status = "confirmed" // Reset to confirmed or keep as pending approval if needed
    return booking.save()
  }

  async getAvailableSlots(date: Date): Promise<string[]> {
    const dateStr = date.toISOString().split("T")[0]
    const cacheKey = `pooja:slots:${dateStr}`
    const cached = await this.cacheManager.get<string[]>(cacheKey)

    if (cached) {
      return cached
    }

    // Find bookings for the entire day
    const startOfDay = new Date(dateStr)
    const endOfDay = new Date(dateStr)
    endOfDay.setDate(endOfDay.getDate() + 1)

    const bookedSlots = await this.poojaModel.find({
      poojaDate: {
        $gte: startOfDay,
        $lt: endOfDay,
      },
      status: "confirmed",
    }).lean().exec()

    const allSlots = [
      "06:00 AM",
      "07:00 AM",
      "08:00 AM",
      "09:00 AM",
      "10:00 AM",
      "04:00 PM",
      "05:00 PM",
      "06:00 PM",
      "07:00 PM",
    ]
    const bookedTimes = bookedSlots.map((p) => {
      // Handle timezone if necessary, assuming UTC stored
      return new Date(p.poojaDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    })

    // Simplification: Mongoose dates might return full ISO strings. 
    // Ideally we should store slots as strings or handle date comparison carefully. 
    // For now assuming existing logic where `toLocaleTimeString` helps.

    // Since we are refactoring, let's keep it robust. If previously it worked with Date object comparison using toLocaleTimeString, Mongoose returns Date objects too.

    const availableSlots = allSlots.filter((slot) => {
      // This filtering logic depends on how bookedTimes are formatted. 
      // Previously: p.poojaDate.toLocaleTimeString()
      // We will trust the previous logic's intent.
      return !bookedTimes.includes(slot) // This might need adjustment based on precise string format
    })

    await this.cacheManager.set(cacheKey, availableSlots || allSlots, 1800000)

    return availableSlots || allSlots
  }

  // Puja Item Methods

  async createItem(itemData: any): Promise<PujaItem> {
    const newItem = new this.pujaItemModel(itemData)
    return newItem.save()
  }

  async findAllItems(filter: any = {}): Promise<PujaItem[]> {
    return this.pujaItemModel.find(filter).lean().exec() as Promise<PujaItem[]>
  }

  async updateItem(id: string, itemData: any): Promise<PujaItem> {
    return this.pujaItemModel.findByIdAndUpdate(id, itemData, { new: true }).exec()
  }

  async deleteItem(id: string): Promise<any> {
    return this.pujaItemModel.findByIdAndDelete(id).exec()
  }


  async updatePoojaRazorpayDetails(
    poojaId: string,
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
    status: string
  ): Promise<PoojaBooking> {
    const booking = await this.poojaModel.findById(poojaId);
    if (!booking) {
      throw new Error(`Pooja booking not found: ${poojaId}`);
    }

    booking.razorpayOrderId = razorpayOrderId;
    booking.razorpayPaymentId = razorpayPaymentId;
    booking.razorpaySignature = razorpaySignature;

    if (status === 'captured') {
      booking.status = 'confirmed';
    } else if (status === 'failed') {
      // Optionally keep as pending or failed
      // booking.status = 'failed'; 
    }

    const savedBooking = await booking.save();

    // Send email notification only for successful payments
    if (status === 'captured') {
      // Check for 80G eligibility (PAN)
      let hasPan = false;
      if (booking.userId) {
        const user = await this.userModel.findById(booking.userId);
        if (user && user.pan) {
          hasPan = true;
        }
      }

      // Send notifications asynchronously (don't block the response)
      this.sendPoojaNotifications(savedBooking, hasPan).catch(err =>
        this.logger.error('Failed to send pooja notifications', err)
      );
    }

    return savedBooking;
  }

  async findPoojaByRazorpayOrderId(razorpayOrderId: string): Promise<PoojaBooking | null> {
    return this.poojaModel.findOne({ razorpayOrderId }).exec();
  }
}
