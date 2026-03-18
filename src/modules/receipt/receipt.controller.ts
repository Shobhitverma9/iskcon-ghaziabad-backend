import { Controller, Post, Param, UseGuards, Logger, Get, Res } from '@nestjs/common'
import { Response } from 'express'
import { ReceiptService } from './receipt.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@Controller('receipt')
export class ReceiptController {
    private readonly logger = new Logger(ReceiptController.name)

    constructor(private readonly receiptService: ReceiptService) { }

    /**
     * Resend receipt email (Authenticated users only)
     * POST /api/receipt/resend/:donationId
     */
    @Post('resend/:donationId')
    @UseGuards(JwtAuthGuard)
    async resendReceipt(@Param('donationId') donationId: string) {
        try {
            await this.receiptService.resendReceipt(donationId)
            return {
                success: true,
                message: 'Receipt resent successfully'
            }
        } catch (error) {
            this.logger.error(`Failed to resend receipt for donation ${donationId}`, error)
            return {
                success: false,
                message: error.message || 'Failed to resend receipt'
            }
        }
    }

    /**
     * Generate receipt manually (Authenticated users only)
     * POST /api/receipt/generate/:donationId
     */
    @Post('generate/:donationId')
    @UseGuards(JwtAuthGuard)
    async generateReceipt(@Param('donationId') donationId: string) {
        try {
            await this.receiptService.generateAndSendReceipt(donationId)
            return {
                success: true,
                message: 'Receipt generated and sent successfully'
            }
        } catch (error) {
            this.logger.error(`Failed to generate receipt for donation ${donationId}`, error)
            return {
                success: false,
                message: error.message || 'Failed to generate receipt'
            }
        }
    }

    /**
     * View receipt in browser
     * GET /api/receipt/view/:donationId
     */
    @Get('view/:donationId')
    async viewReceipt(@Param('donationId') donationId: string, @Res() res: Response) {
        try {
            const url = await this.receiptService.generateReceiptPDFById(donationId)
            res.redirect(url)
        } catch (error) {
            this.logger.error(`Failed to view receipt for donation ${donationId}`, error)
            res.status(404).json({
                success: false,
                message: error.message || 'Receipt not found'
            })
        }
    }

    /**
     * Get Cloudinary URL for receipt
     * GET /api/receipt/url/:donationId
     */
    @Get('url/:donationId')
    async getReceiptUrl(@Param('donationId') donationId: string) {
        try {
            const url = await this.receiptService.generateReceiptPDFById(donationId)
            return { success: true, url }
        } catch (error) {
            this.logger.error(`Failed to get receipt URL for donation ${donationId}`, error)
            return {
                success: false,
                message: error.message || 'Failed to get receipt URL'
            }
        }
    }

    /**
     * Download receipt PDF
     * GET /api/receipt/download/:donationId
     */
    @Get('download/:donationId')
    async downloadReceipt(@Param('donationId') donationId: string, @Res() res: Response) {
        try {
            // For download, we still provide the buffer or redirect. 
            // Redirecting to Cloudinary will let the browser handle it.
            const url = await this.receiptService.generateReceiptPDFById(donationId)
            res.redirect(url)
        } catch (error) {
            this.logger.error(`Failed to download receipt for donation ${donationId}`, error)
            res.status(404).json({
                success: false,
                message: error.message || 'Receipt not found'
            })
        }
    }
}
