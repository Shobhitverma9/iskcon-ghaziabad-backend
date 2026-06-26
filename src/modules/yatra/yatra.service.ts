import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { YatraBooking, YatraBookingDocument } from './schemas/yatra-booking.schema';
import { CreateYatraBookingDto, VerifyYatraPaymentDto } from './dto/yatra.dto';
import { PaymentService } from '../payment/payment.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class YatraService {
  private readonly logger = new Logger(YatraService.name);
  private readonly PRICE_PER_PERSON = 30000;
  private readonly ADVANCE_PERCENTAGE = 0.25;

  constructor(
    @InjectModel(YatraBooking.name) private yatraModel: Model<YatraBookingDocument>,
    private readonly paymentService: PaymentService,
    private readonly notificationService: NotificationService,
  ) {}

  async createBooking(dto: CreateYatraBookingDto) {
    const totalAmount = dto.numberOfPersons * this.PRICE_PER_PERSON;
    const amountToPay = dto.paymentType === 'advance' 
      ? totalAmount * this.ADVANCE_PERCENTAGE 
      : totalAmount;

    // 1. Create local record
    const booking = new this.yatraModel({
      ...dto,
      totalAmount,
      status: 'pending',
    });
    const savedBooking = await booking.save();

    // 2. Create Razorpay order
    try {
      const order = await this.paymentService.createOrder({
        amount: amountToPay,
        currency: 'INR',
        notes: {
          bookingId: (savedBooking as any)._id.toString(),
          type: 'yatra_booking',
          yatraName: dto.yatraName || 'Kedarnath-Badrinath 2026',
        },
      });

      // Update booking with order ID
      savedBooking.razorpayOrderId = order.id;
      await savedBooking.save();

      return {
        booking: savedBooking,
        order,
      };
    } catch (error) {
      this.logger.error('Failed to create Razorpay order for Yatra', error);
      throw new BadRequestException('Failed to initiate payment');
    }
  }

  async verifyPayment(dto: VerifyYatraPaymentDto) {
    const isValid = this.paymentService.verifyPaymentSignature({
      razorpayOrderId: dto.razorpayOrderId,
      razorpayPaymentId: dto.razorpayPaymentId,
      razorpaySignature: dto.razorpaySignature,
    });

    if (!isValid) {
      throw new BadRequestException('Invalid payment signature');
    }

    const booking = await this.yatraModel.findById(dto.bookingId);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Update booking status
    booking.razorpayPaymentId = dto.razorpayPaymentId;
    booking.razorpaySignature = dto.razorpaySignature;
    
    const amountPaid = booking.paymentType === 'advance' 
      ? booking.totalAmount * this.ADVANCE_PERCENTAGE 
      : booking.totalAmount;
    
    booking.amountPaid = amountPaid;
    booking.status = booking.paymentType === 'advance' ? 'partial' : 'paid';

    await booking.save();

    // Send Notification
    this.sendBookingConfirmation(booking);

    return { success: true, booking };
  }

  private async sendBookingConfirmation(booking: YatraBookingDocument) {
    try {
      const subject = `Booking Confirmed: ${booking.yatraName}`;
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; line-height: 1.6;">
            <div style="background-color: #8B0000; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Yatra Booking Confirmed!</h1>
                <p style="color: #FF9933; font-weight: bold; margin-top: 10px; font-size: 18px;">ISKCON Ghaziabad</p>
            </div>
            <div style="padding: 30px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 12px 12px; background-color: #ffffff;">
                <p>Dear <strong>${booking.name}</strong>,</p>
                <p>Hare Krishna! Please accept our humble obeisances. All glories to Srila Prabhupada.</p>
                <p>Thank you for booking the <strong>${booking.yatraName}</strong>. We are delighted to have you join us on this spiritual journey.</p>
                
                <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #FF9933;">
                    <h3 style="margin-top: 0; color: #8B0000;">Booking Summary</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="padding: 5px 0;"><strong>Travelers:</strong></td><td style="text-align: right;">${booking.numberOfPersons}</td></tr>
                        <tr><td style="padding: 5px 0;"><strong>Total Package:</strong></td><td style="text-align: right;">₹${booking.totalAmount.toLocaleString()}</td></tr>
                        <tr><td style="padding: 5px 0;"><strong>Amount Paid:</strong></td><td style="text-align: right; color: #28a745;">₹${booking.amountPaid.toLocaleString()}</td></tr>
                        <tr><td style="padding: 5px 0;"><strong>Status:</strong></td><td style="text-align: right;">${booking.status === 'partial' ? 'Advance Received' : 'Fully Paid'}</td></tr>
                    </table>
                </div>

                <p><strong>Next Steps:</strong></p>
                <ul>
                    <li>Our Yatra coordinator will contact you shortly with the detailed itinerary and packing list.</li>
                    <li>If you have paid the advance, the remaining balance of ₹${(booking.totalAmount - booking.amountPaid).toLocaleString()} will be due before departure.</li>
                </ul>

                <p>For any queries, please call us at <a href="tel:+919650444899" style="color: #8B0000; font-weight: bold;">+91 9650444899</a> or reply to this email.</p>

                <div style="text-align: center; margin: 35px 0;">
                    <p style="font-weight: bold; color: #8B0000; background-color: #fff9f2; padding: 15px; border-radius: 8px;">
                        Hare Krishna, Hare Krishna, Krishna Krishna, Hare Hare<br>
                        Hare Rama, Hare Rama, Rama Rama, Hare Hare
                    </p>
                </div>
                
                <p>Your servants,<br><strong>ISKCON Ghaziabad Yatra Team</strong></p>
            </div>
            <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
                <p>© ${new Date().getFullYear()} ISKCON Ghaziabad. All rights reserved.</p>
            </div>
        </div>`;

      if (booking.email) {
        await this.notificationService.sendEmail(booking.email, subject, htmlBody);
      }
      
      // Admin notification
      const adminMsg = `🚨 *New Yatra Booking*\n\nName: ${booking.name}\nPhone: ${booking.phone}\nPersons: ${booking.numberOfPersons}\nAmount Paid: ₹${booking.amountPaid}\nType: ${booking.paymentType}`;
      await this.notificationService.sendWhatsapp('919650444899', adminMsg);

    } catch (error) {
      this.logger.error('Failed to send booking notification', error);
    }
  }

  async findAll() {
    return this.yatraModel.find().sort({ createdAt: -1 }).exec();
  }

  async findById(id: string) {
    return this.yatraModel.findById(id).exec();
  }
}
