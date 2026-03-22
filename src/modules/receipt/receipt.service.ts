import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'
import * as puppeteer from 'puppeteer'
import { Browser } from 'puppeteer' // Added Browser import
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
export class ReceiptService implements OnModuleDestroy { // Implemented OnModuleDestroy
    private readonly logger = new Logger(ReceiptService.name)
    private browser: Browser | null = null; // Added browser property
    private browserPromise: Promise<Browser> | null = null; // Added browserPromise property

    constructor(
        @InjectModel(Donation.name) private donationModel: Model<DonationDocument>,
        @InjectModel(ReceiptCounter.name) private counterModel: Model<ReceiptCounterDocument>,
        private readonly notificationService: NotificationService,
        private readonly storageService: StorageService,
    ) { }

    async onModuleDestroy() {
        if (this.browser) {
            this.logger.log('Closing Puppeteer browser instance...');
            await this.browser.close();
            this.browser = null;
        }
    }

    /**
     * Singleton pattern for Chromium Browser to prevent Cloud Run OOM crashes.
     * Launching a new Chromium binary per request consumes 250MB+ RAM and kills
     * the 1GB container immediately if multiple requests (or clicks) happen at once.
     */
    private getBrowser(): Promise<Browser> {
        if (this.browser && this.browser.isConnected()) {
            return Promise.resolve(this.browser);
        }
        
        if (this.browserPromise) {
            return this.browserPromise;
        }

        this.logger.log(`🛠️ Launching persistent Puppeteer Browser instance...`)
        this.browserPromise = puppeteer.launch({
            headless: true,
            pipe: true, // CRITICAL FOR CLOUD RUN: Communicate over pipes instead of reliable-dropping WebSockets
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-features=IsolateOrigins,site-per-process', // Safe on Debian, prevents iframe memory leaks
                '--disk-cache-size=0', // Prevent writing cache to /tmp (which is RAM on Cloud Run)
                '--disable-extensions',
                '--js-flags=--max-old-space-size=512' // Constrain Chrome JS engine to avoid OOM
            ]
        }).then(browser => {
            this.browser = browser;
            this.browserPromise = null;
            
            // Handle unexpected browser crashes (e.g. fatal OOM)
            browser.on('disconnected', () => {
                this.logger.warn(`⚠️ Puppeteer Browser disconnected. It will be restarted on next request.`);
                this.browser = null;
            });
            
            return browser;
        }).catch(err => {
            this.browserPromise = null;
            throw err;
        });

        return this.browserPromise;
    }

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

        // Convert external S3 images to offline Base64 to prevent Page.printToPDF timeouts
        try {
            const publicPath = path.resolve(process.cwd(), 'public/images')
            const bgBase64 = fs.readFileSync(path.join(publicPath, 'bg.png')).toString('base64')
            const logoBase64 = fs.readFileSync(path.join(publicPath, 'logo.png')).toString('base64')
            const rupeeBase64 = fs.readFileSync(path.join(publicPath, 'rupee.png')).toString('base64')
            
            html = html.replace(/https:\/\/iskcon-admin-bucket\.s3\.ap-south-1\.amazonaws\.com\/image_2023_08_18T05_51_36_789Z\.png/g, `data:image/png;base64,${bgBase64}`)
            html = html.replace(/https:\/\/iskcon-admin-bucket\.s3\.ap-south-1\.amazonaws\.com\/image_2023_08_18T05_51_36_790Z\.png/g, `data:image/png;base64,${logoBase64}`)
            html = html.replace(/https:\/\/iskcon-admin-bucket\.s3\.ap-south-1\.amazonaws\.com\/image_2023_08_18T05_51_36_787Z\.png/g, `data:image/png;base64,${rupeeBase64}`)
        } catch (imgError) {
            this.logger.warn(`Could not load local fallback images for PDF, using remote S3 URLs instead. Error: ${imgError.message}`)
        }

        // Remove any remaining template comments (if any)
        html = html.replace(/\{%\s*comment\s*%\}[\s\S]*?\{%\s*endcomment\s*%\}/g, '')

        // Remove Google Fonts @import — Cloud Run can't reliably fetch it;
        // Helvetica/Arial fallbacks in the template are sufficient for the PDF.
        html = html.replace(/@import url\([^)]*fonts\.googleapis\.com[^)]*\);?/g, '')

        // Inline Bootstrap CSS from the locally bundled file (no CDN needed)
        const bootstrapPath = path.resolve(process.cwd(), 'public/bootstrap.min.css')
        if (fs.existsSync(bootstrapPath)) {
            const bootstrapCSS = fs.readFileSync(bootstrapPath, 'utf-8')
            html = html.replace('</head>', `<style>${bootstrapCSS}</style>\n</head>`)
        }

        // Strip external script tags (jQuery, Popper, Bootstrap JS) — not needed in a PDF
        html = html.replace(/<script\s+src=["'][^"']*["'][^>]*><\/script>/gi, '')

        // CRITICAL FIX FOR "Protocol error (Page.printToPDF)":
        // The original template uses `height: 100%` and `@page { margin: 8cm }`.
        // If the content (e.g. a long amount_in_words for Monthly donations) pushes the 100%-height container
        // past the printable boundary, Chromium's PDF paginator gets stuck in an infinite layout loop and crashes!
        // We MUST force all outer containers to `height: auto` and override the broken page margins.
        html = html.replace('</head>', `
        <style>
            @media print {
                html, body { height: auto !important; margin: 0 !important; padding: 0 !important; }
                .section-1, .container-fluid { 
                    height: auto !important; 
                    min-height: 0 !important; 
                    page-break-inside: avoid !important;
                }
                @page { margin: 0 !important; size: A4; }
            }
        </style>
        </head>`)
        
        // As a final safety net, manually strip the inline "height: 100%;" from `.section-1` divs
        html = html.replace(/height:\s*100%\s*;/gi, '')

        return html
    }

    /**
     * Generate PDF using puppeteer
     */
    async generateReceiptPDF(donation: Donation, receiptNumber: string): Promise<Buffer> {
        const receiptData = this.mapDonationToReceiptData(donation, receiptNumber)
        const html = this.generateHTMLReceipt(receiptData)

        try {
            const browser = await this.getBrowser()
            const page = await browser.newPage()
            const tmpHtmlPath = path.join('/tmp', `receipt_${Date.now()}_${Math.random().toString(36).substring(7)}.html`)

            try {
                // Set a fixed viewport before setting content to stabilize layout
                await page.setViewport({ width: 1200, height: 800 })

                // Write HTML to disk and use file:// protocol.
                // setContent() tries to send 160KB+ of HTML over a single WebSocket message, 
                // which can crash Chromium with "Target closed". Loading via file is 100% safe.
                fs.writeFileSync(tmpHtmlPath, html, 'utf-8')
                
                await page.goto(`file://${tmpHtmlPath}`, {
                    waitUntil: ['load', 'networkidle0'], 
                    timeout: 30000
                })

                // Bring the page to the front to ensure the renderer thread is fully active
                await page.bringToFront()

                const pdfBuffer = await page.pdf({
                    format: 'A4',
                    printBackground: true, 
                    margin: { top: '0px', bottom: '0px', left: '0px', right: '0px' },
                    preferCSSPageSize: true, // Forces Chrome to respect our @page overrides safely
                    timeout: 30000 
                })

                return Buffer.from(pdfBuffer)
            } finally {
                // ALWAYS close the lightweight tab, even if generation failed.
                // Otherwise, tabs leak memory in the persistent Browser and crash the container!
                try { await page.close() } catch (_) {}
                try { fs.unlinkSync(tmpHtmlPath) } catch (_) {}
            }
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

            // STRICT CONCURRENCY LOCK: 
            // If receiptNumber already exists, another request (Webhook or /verify) 
            // has already claimed this donation and is currently generating the PDF.
            // We MUST return immediately to prevent launching concurrent Chromium instances.
            // Note: Manual Resends use resendReceipt() which bypasses this check.
            if (donation.receiptNumber) {
                this.logger.warn(`⚠️ Receipt generation already claimed or completed for donation ${donationId}. Aborting duplicate request.`)
                return
            }

            // Generate new receipt number 
            const receiptNumber = await this.generateReceiptNumber()
            
            // ATOMIC LOCK: Final safety net against same-millisecond race conditions
            const claimed = await this.donationModel.findOneAndUpdate(
                { 
                    _id: donationId, 
                    $or: [
                        { receiptNumber: { $exists: false } },
                        { receiptNumber: null }
                    ]
                },
                { receiptNumber: receiptNumber },
                { new: true }
            )

            if (!claimed) {
                this.logger.warn(`⚠️ Receipt generation already in progress by another request for ${donationId}. Aborting concurrent task.`)
                return
            }
            
            this.logger.log(`🔢 Claimed and generated receipt number: ${receiptNumber}`)

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

        // Regenerate PDF buffer
        const pdfBuffer = await this.generateReceiptPDF(donation, donation.receiptNumber)
        
        // Ensure a Cloudinary URL exists (critical for WhatsApp templates which require a link, not a buffer)
        let currentReceiptUrl = donation.receiptUrl;
        if (!currentReceiptUrl) {
            this.logger.log(`No receiptUrl found for donation ${donationId} during resend. Uploading to Cloudinary...`);
            const filename = `receipts/${donation.receiptNumber.replace(/\s+/g, '_')}_${donationId}.pdf`;
            currentReceiptUrl = await this.storageService.uploadFile(pdfBuffer, filename, 'application/pdf', 'raw');
            donation.receiptUrl = currentReceiptUrl;
        }

        // Resend email with attachment 
        await this.sendReceiptEmail(donation, donation.receiptNumber, pdfBuffer, currentReceiptUrl)
        
        // Send WhatsApp receipt if phone exists
        if (donation.donorPhone && currentReceiptUrl) {
            await this.notificationService.sendWhatsappReceipt(
                donation.donorPhone,
                currentReceiptUrl,
                donation.donorName,
                donation.amount,
                donation.category
            );
        }

        // Update database
        await this.donationModel.findByIdAndUpdate(donationId, {
            receiptUrl: currentReceiptUrl,
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
