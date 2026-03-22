import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'
import * as puppeteer from 'puppeteer'
import { Donation, DonationDocument } from '../donation/schemas/donation.schema'
import { ReceiptCounter, ReceiptCounterDocument } from './schemas/receipt-counter.schema'
import { NotificationService } from '../notification/notification.service'
import { StorageService } from '../../shared/storage/storage.service'

const execAsync = promisify(exec)

interface ReceiptData {
    id: string
    date: string
    amount: number
    amount_in_words: string
    fullName: string
    address: string
    pinCode: string
    panNo: string
    mobileNo: string
    email: string
    paymentMethod: number
    transactionDetails: string
    purposeId: string
    user: string
}

@Injectable()
export class ReceiptService {
    private readonly logger = new Logger(ReceiptService.name)

    constructor(
        @InjectModel(Donation.name) private donationModel: Model<DonationDocument>,
        @InjectModel(ReceiptCounter.name) private counterModel: Model<ReceiptCounterDocument>,
        private readonly notificationService: NotificationService,
        private readonly storageService: StorageService,
    ) { }

    /**
     * Generate next sequential receipt number
     * Format: "038011 11000", "038011 11001", etc.
     * Uses MongoDB's findOneAndUpdate with $inc for atomic increment
     */
    async generateReceiptNumber(): Promise<string> {
        const counter = await this.counterModel.findOneAndUpdate(
            { name: 'donation_receipt' },
            { $inc: { sequence: 1 } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        )

        const sequenceStr = counter.sequence.toString().padStart(5, '0')
        return `${counter.prefix} ${sequenceStr}`
    }

    /**
     * Get payment method text from numeric code
     */
    private getPaymentMethodText(method: number): string {
        const methods: { [key: number]: string } = {
            1: 'Upi',
            2: 'Cheque',
            3: 'NFT/RTGS',
            4: 'Debit Card',
            5: 'Credit Card',
            6: 'Cash',
            7: 'Bank IMPS'
        }
        return methods[method] || 'Online'
    }

    /**
     * Convert number to words (Indian numbering system)
     */
    private numberToWords(num: number): string {
        const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE']
        const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY']
        const teens = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN']

        if (num === 0) return 'ZERO'

        const crore = Math.floor(num / 10000000)
        const lakh = Math.floor((num % 10000000) / 100000)
        const thousand = Math.floor((num % 100000) / 1000)
        const hundred = Math.floor((num % 1000) / 100)
        const remainder = num % 100

        let words = ''

        if (crore > 0) {
            words += this.numberToWords(crore) + ' CRORE '
        }
        if (lakh > 0) {
            words += this.numberToWords(lakh) + ' LAKH '
        }
        if (thousand > 0) {
            words += this.numberToWords(thousand) + ' THOUSAND '
        }
        if (hundred > 0) {
            words += ones[hundred] + ' HUNDRED '
        }

        if (remainder >= 20) {
            words += tens[Math.floor(remainder / 10)] + ' '
            if (remainder % 10 > 0) {
                words += ones[remainder % 10] + ' '
            }
        } else if (remainder >= 10) {
            words += teens[remainder - 10] + ' '
        } else if (remainder > 0) {
            words += ones[remainder] + ' '
        }

        return words.trim() + ' RUPEES'
    }

    /**
     * Extract last 4 digits from Razorpay payment ID
     */
    private extractTransactionDetails(paymentId: string): string {
        if (!paymentId) {
            return 'N/A'
        }
        // User requested extraction, but if they want full ID we can return paymentId
        // Returning last 4 digits as per request/standard
        return paymentId.length >= 4 ? paymentId.slice(-4) : paymentId
    }

    /**
     * Map donation to receipt data format
     */
    private mapDonationToReceiptData(donation: Donation, receiptNumber: string): ReceiptData {
        // Determine payment method (default to UPI if captured via Razorpay)
        const paymentMethod = donation.metadata?.paymentMethod || 1 // Default to UPI

        return {
            id: receiptNumber.split(' ')[1] || '00000', // Extract just the number part
            date: new Date(donation.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }),
            amount: donation.amount,
            amount_in_words: this.numberToWords(donation.amount),
            fullName: donation.donorName,
            address: [donation.address, donation.city, donation.state].filter(Boolean).join(', ') || 'N/A',
            pinCode: donation.pincode || 'N/A',
            panNo: donation.pan || 'N/A',
            mobileNo: donation.donorPhone,
            email: donation.donorEmail,
            paymentMethod,
            transactionDetails: this.extractTransactionDetails(donation.razorpayPaymentId),
            purposeId: donation.category || 'GENERAL',
            user: donation.metadata?.processedBy || 'System'
        }
    }

    /**
     * Generate receipt HTML from template
     */
    private generateHTMLReceipt(receiptData: ReceiptData): string {
        // Correct path to internal public folder inside the backend container
        const templatePath = path.resolve(process.cwd(), 'public/recipt.html')
        this.logger.log(`📄 Reading receipt template from: ${templatePath}`)

        if (!fs.existsSync(templatePath)) {
            this.logger.error(`❌ Template not found at: ${templatePath}`)
            throw new Error(`Receipt template not found at ${templatePath}`)
        }

        let html = fs.readFileSync(templatePath, 'utf-8')


        // Replace variables
        html = html.replace(/\{\{\s*id\s*\}\}/g, receiptData.id)
        html = html.replace(/\{\{\s*date\s*\}\}/g, receiptData.date)
        html = html.replace(/\{\{\s*amount\s*\}\}/g, receiptData.amount.toString())
        html = html.replace(/\{\{\s*amount_in_words\s*\}\}/g, receiptData.amount_in_words)
        html = html.replace(/\{\{\s*fullName\s*\}\}/g, receiptData.fullName)
        html = html.replace(/\{\{\s*address\s*\}\}/g, receiptData.address)
        html = html.replace(/\{\{\s*pinCode\s*\}\}/g, receiptData.pinCode)
        html = html.replace(/\{\{\s*panNo\s*\}\}/g, receiptData.panNo)
        html = html.replace(/\{\{\s*mobileNo\s*\}\}/g, receiptData.mobileNo)
        html = html.replace(/\{\{\s*email\s*\}\}/g, receiptData.email)
        html = html.replace(/\{\{\s*transactionDetails\s*\}\}/g, receiptData.transactionDetails)
        html = html.replace(/\{\{\s*purposeId\s*\}\}/g, receiptData.purposeId)
        html = html.replace(/\{\{\s*user\s*\}\}/g, receiptData.user)
        html = html.replace(/\{\{\s*paymentMethodText\s*\}\}/g, this.getPaymentMethodText(receiptData.paymentMethod))
        html = html.replace(/\{\{\s*transactionDetails\s*\}\}/g, receiptData.transactionDetails)

        // Remove any remaining template comments (if any)
        html = html.replace(/\{%\s*comment\s*%\}[\s\S]*?\{%\s*endcomment\s*%\}/g, '')

        // Inject Bootstrap CSS
        const bootstrapLink = '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css">'
        html = html.replace('</head>', `${bootstrapLink}\n</head>`)

        return html
    }

    /**
     * Generate PDF using puppeteer
     */
    async generateReceiptPDF(donation: Donation, receiptNumber: string): Promise<Buffer> {
        const receiptData = this.mapDonationToReceiptData(donation, receiptNumber)
        const html = this.generateHTMLReceipt(receiptData)

        try {
            this.logger.log(`🛠️ Launching Puppeteer...`)
            const args = [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ];

            const browser = await puppeteer.launch({
                headless: true,
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
                args: args
            })

            // Spin up a tiny ephemeral HTTP server to serve the HTML.
            // This is the only approach that works reliably across ALL environments:
            // - Windows local dev (no file:// restrictions)
            // - Alpine Linux Cloud Run (no filesystem sandbox issues)  
            // - No URL length limits (unlike data: URI)
            // - No navigation frame detachment (unlike setContent)
            const http = require('http') as typeof import('http')
            let receiptServer: import('http').Server
            const serverPort = await new Promise<number>((resolve, reject) => {
                receiptServer = http.createServer((_req: any, res: any) => {
                    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
                    res.end(html)
                })
                receiptServer.listen(0, '127.0.0.1', () => {
                    const addr = receiptServer.address() as { port: number }
                    resolve(addr.port)
                })
                receiptServer.on('error', reject)
            })

            this.logger.log(`📡 Serving HTML on http://127.0.0.1:${serverPort}`)
            const page = await browser.newPage()

            // Block external JS scripts — jQuery, Bootstrap JS, Popper are NOT needed in a PDF.
            // On Cloud Run, fetching these CDN resources hangs, blocking DOMContentLoaded from
            // firing and causing the 30s timeout. CSS and images are still allowed.
            await page.setRequestInterception(true)
            page.on('request', (req) => {
                const url = req.url()
                const isExternal = !url.includes('127.0.0.1')
                if (req.resourceType() === 'script' && isExternal) {
                    req.abort()
                } else {
                    req.continue()
                }
            })

            await page.goto(`http://127.0.0.1:${serverPort}`, {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            })
            // Brief wait for external resources (Google Fonts, S3 images, Bootstrap CDN)
            await new Promise(resolve => setTimeout(resolve, 1500))

            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { top: '0px', bottom: '0px', left: '0px', right: '0px' }
            })

            await browser.close()
            receiptServer!.close()

            return Buffer.from(pdfBuffer)
        } catch (error) {
            this.logger.error(`❌ Puppeteer PDF generation failed: ${error.message}`, error.stack)
            throw error
        }
    }

    /**
     * Send receipt email with PDF attachment
     */
    async sendReceiptEmail(donation: Donation, receiptNumber: string, pdfBuffer: Buffer, receiptUrl?: string): Promise<void> {
        const subject = `Donation Receipt - ${receiptNumber}`
        const last4 = this.extractTransactionDetails(donation.razorpayPaymentId)

        const htmlBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #3C4095;">Thank You for Your Donation!</h2>
                
                <p>Dear ${donation.donorName},</p>
                
                <p>Thank you for your generous donation of <strong>₹${donation.amount}</strong> to <strong>ISKCON Ghaziabad</strong>.</p>
                
                <p>Your donation receipt (<strong>${receiptNumber}</strong>) is attached to this email.</p>
                ${receiptUrl ? `<p>You can also download your receipt from this link: <a href="${receiptUrl}">Download Receipt</a></p>` : ''}
                
                <h3 style="color: #EB248F; margin-top: 20px;">Donation Details:</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Amount:</strong></td>
                        <td style="padding: 8px; border-bottom: 1px solid #eee;">₹${donation.amount}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Date:</strong></td>
                        <td style="padding: 8px; border-bottom: 1px solid #eee;">${new Date(donation.createdAt).toLocaleDateString('en-IN')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Transaction ID:</strong></td>
                        <td style="padding: 8px; border-bottom: 1px solid #eee;">****${last4}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Category:</strong></td>
                        <td style="padding: 8px; border-bottom: 1px solid #eee;">${donation.category || 'General'}</td>
                    </tr>
                </table>
                
                <p style="margin-top: 20px;">Your contribution helps us serve the community and spread Krishna consciousness.</p>
                
                <p style="color: #3C4095; font-weight: bold; margin-top: 30px;">Hare Krishna! 🙏</p>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                
                <p style="font-size: 12px; color: #666;">
                    <strong>ISKCON Ghaziabad</strong><br>
                    Hare Krishna Marg, ISKCON Chowk<br>
                    R-11/35, Raj Nagar, Ghaziabad (U.P.) - 201002<br>
                    Phone: 7303451551<br>
                    Email: info@iskconghaziabad.com
                </p>
            </div>
        `

        const textBody = `
Dear ${donation.donorName},

Thank you for your generous donation of ₹${donation.amount} to ISKCON Ghaziabad.

Your donation receipt (${receiptNumber}) is attached to this email.
${receiptUrl ? `Download Link: ${receiptUrl}` : ''}

Details:
- Amount: ₹${donation.amount}
- Date: ${new Date(donation.createdAt).toLocaleDateString('en-IN')}
- Transaction ID: ****${last4}
- Category: ${donation.category || 'General'}

May Krishna bless you!

ISKCON Ghaziabad Team
        `

        const attachments = [{
            Name: `Receipt_${receiptNumber.replace(' ', '_')}.pdf`,
            Content: pdfBuffer.toString('base64'),
            ContentType: 'application/pdf'
        }]

        await this.notificationService.sendEmail(
            donation.donorEmail,
            subject,
            htmlBody,
            textBody,
            attachments
        )
    }

    /**
     * Main function: Generate receipt and send email
     */
    async generateAndSendReceipt(donationId: string): Promise<void> {
        this.logger.log(`🚀 Starting receipt generation for donation ${donationId}`)
        try {
            const donation = await this.donationModel.findById(donationId)

            if (!donation) {
                this.logger.error(`❌ Donation ${donationId} not found`)
                throw new Error(`Donation ${donationId} not found`)
            }

            // Skip if receipt already generated AND has URL (if we want to ensure URL exists)
            if (donation.receiptNumber && donation.receiptUrl) {
                this.logger.warn(`⚠️ Receipt already generated and uploaded for donation ${donationId}: ${donation.receiptNumber}`)
                return
            }

            // Generate receipt number if not exists
            let receiptNumber = donation.receiptNumber;
            if (!receiptNumber) {
                receiptNumber = await this.generateReceiptNumber()
                this.logger.log(`🔢 Generated receipt number: ${receiptNumber}`)
            }

            // Generate PDF
            this.logger.log(`📄 Generating PDF...`)
            const pdfBuffer = await this.generateReceiptPDF(donation, receiptNumber)
            this.logger.log(`✅ PDF generated successfully (${pdfBuffer.length} bytes)`)

            // Upload to Cloudinary
            this.logger.log(`☁️ Uploading receipt to Cloudinary...`)
            const filename = `receipts/${receiptNumber.replace(/\s+/g, '_')}_${donationId}.pdf`
            const receiptUrl = await this.storageService.uploadFile(pdfBuffer, filename, 'application/pdf', 'raw')
            this.logger.log(`✅ Uploaded to Cloudinary: ${receiptUrl}`)

            // Send email
            this.logger.log(`📧 Sending email to ${donation.donorEmail}...`)
            await this.sendReceiptEmail(donation, receiptNumber, pdfBuffer, receiptUrl)
            this.logger.log(`✅ Email sent successfully`)

            // Send WhatsApp Receipt Template
            if (donation.donorPhone) {
                this.logger.log(`📱 Sending WhatsApp receipt template (receiptv4) to ${donation.donorPhone}...`)
                await this.notificationService.sendWhatsappReceipt(
                    donation.donorPhone,
                    receiptUrl,
                    donation.donorName,
                    donation.amount,
                    donation.category
                )
                this.logger.log(`✅ WhatsApp receipt template sent`)
            }

            // Update donation record
            await this.donationModel.findByIdAndUpdate(donationId, {
                receiptNumber,
                receiptUrl,
                receiptGeneratedAt: donation.receiptGeneratedAt || new Date(),
                receiptSentAt: new Date()
            })

            this.logger.log(`✅ Receipt ${receiptNumber} process completed for donation ${donationId}`)
        } catch (error) {
            this.logger.error(`❌ Failed to generate receipt for donation ${donationId}: ${error.message}`, error.stack)
            throw error
        }
    }


    /**
     * Resend receipt (for admin use)
     */
    async resendReceipt(donationId: string): Promise<void> {
        const donation = await this.donationModel.findById(donationId)

        if (!donation) {
            throw new Error(`Donation ${donationId} not found`)
        }

        if (!donation.receiptNumber) {
            this.logger.warn(`No receipt found for donation ${donationId}. Generating a new one...`)
            return this.generateAndSendReceipt(donationId);
        }

        // Regenerate PDF and resend
        const pdfBuffer = await this.generateReceiptPDF(donation, donation.receiptNumber)
        await this.sendReceiptEmail(donation, donation.receiptNumber, pdfBuffer, donation.receiptUrl)
        
        // Also send WhatsApp receipt if phone exists
        if (donation.donorPhone && donation.receiptUrl) {
            await this.notificationService.sendWhatsappReceipt(
                donation.donorPhone,
                donation.receiptUrl,
                donation.donorName,
                donation.amount,
                donation.category
            );
        }

        // Update resend timestamp
        await this.donationModel.findByIdAndUpdate(donationId, {
            receiptSentAt: new Date()
        })

        this.logger.log(`✅ Receipt ${donation.receiptNumber} resent for donation ${donationId}`)
    }
    /**
     * Generate receipt PDF by donation ID and upload to Cloudinary
     */
    async generateReceiptPDFById(donationId: string): Promise<string> {
        const donation = await this.donationModel.findById(donationId)

        if (!donation) {
            throw new Error(`Donation ${donationId} not found`)
        }

        if (donation.receiptUrl) {
            return donation.receiptUrl
        }

        if (!donation.receiptNumber) {
            // Generate receipt number if not exists
            const receiptNumber = await this.generateReceiptNumber()
            donation.receiptNumber = receiptNumber
            donation.receiptGeneratedAt = new Date()
            await donation.save()
        }

        const pdfBuffer = await this.generateReceiptPDF(donation, donation.receiptNumber)

        // Upload to Cloudinary
        const filename = `receipts/${donation.receiptNumber.replace(/\s+/g, '_')}_${donationId}.pdf`
        const cloudinaryUrl = await this.storageService.uploadFile(pdfBuffer, filename, 'application/pdf', 'raw')

        // Update donation with receipt URL
        donation.receiptUrl = cloudinaryUrl
        await donation.save()

        return cloudinaryUrl
    }

    /**
     * Get receipt PDF buffer (for backward compatibility if needed)
     */
    async getReceiptPDFBuffer(donationId: string): Promise<Buffer> {
        const donation = await this.donationModel.findById(donationId)
        if (!donation) throw new Error(`Donation ${donationId} not found`)

        if (!donation.receiptNumber) {
            const receiptNumber = await this.generateReceiptNumber()
            donation.receiptNumber = receiptNumber
            donation.receiptGeneratedAt = new Date()
            await donation.save()
        }

        return this.generateReceiptPDF(donation, donation.receiptNumber)
    }
}
