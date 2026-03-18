
import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"
import { DonationService } from "./modules/donation/donation.service"
import { ReceiptService } from "./modules/receipt/receipt.service"
import { NotificationService } from "./modules/notification/notification.service"
import { getModelToken } from "@nestjs/mongoose"
import { Donation, DonationDocument } from "./modules/donation/schemas/donation.schema"
import { Model } from "mongoose"

async function verifyFlow() {
    console.log("Initializing NestJS Application Context...")
    const app = await NestFactory.createApplicationContext(AppModule)

    try {
        const receiptService = app.get(ReceiptService)
        const notificationService = app.get(NotificationService)
        const donationModel = app.get<Model<DonationDocument>>(getModelToken(Donation.name))

        const testEmail = "shobhit@iskconghaziabad.com"
        const testPhone = "917011147999"
        const testName = "Verification Bot"

        console.log("\n--- STARTING CHECKOUT FLOW VERIFICATION ---")

        // 1. Create a dummy donation
        console.log("Creating test donation...")
        const testDonation = await donationModel.create({
            donorName: testName,
            donorEmail: testEmail,
            donorPhone: testPhone,
            amount: 501,
            category: "Krishna Seva",
            type: "one-time",
            status: "pending",
            razorpayOrderId: "order_test_" + Date.now(),
            razorpayPaymentId: "pay_test_" + Date.now(),
            transactionId: "TXN_" + Date.now(),
            fundId: 2,
            metadata: {}
        })

        if (!testDonation) {
            throw new Error("Failed to create test donation")
        }

        console.log(`✅ Step 1: Created test donation with ID: ${testDonation._id}`)

        // 2. Test Success Flow (Receipt + Email + WhatsApp)
        console.log("\n--- Testing SUCCESS Flow ---")
        try {
            console.log(`Triggering generateAndSendReceipt for donation ${testDonation._id}...`)
            await receiptService.generateAndSendReceipt(testDonation._id.toString())
            console.log("✅ Success Flow: Triggered successfully. Check logs for Email/WhatsApp results.")
        } catch (err) {
            console.error("❌ Success Flow Error:", err.message)
        }

        // 3. Test Cancellation/Failure Flow
        console.log("\n--- Testing CANCELLATION Flow ---")
        try {
            const donationPageUrl = "https://iskconghaziabad.com/donate/krishna-seva"

            console.log(`Sending Cancellation Email to ${testEmail}...`)
            await notificationService.sendCancellationEmail(
                testEmail,
                testName,
                testDonation.amount,
                testDonation.category,
                donationPageUrl
            )

            console.log(`Sending Cancellation WhatsApp to ${testPhone} using 'cancelled_payment' template...`)
            await notificationService.sendWhatsappCancelledPayment(
                testPhone,
                testName,
                testDonation.amount,
                testDonation.category,
                donationPageUrl
            )

            console.log("✅ Cancellation Flow: Notifications triggered.")
        } catch (err) {
            console.error("❌ Cancellation Flow Error:", err.message)
        }

        console.log("\n--- VERIFICATION COMPLETE ---")

        // Cleanup
        await donationModel.findByIdAndDelete(testDonation._id)
        console.log(`🗑️ Cleaned up test donation: ${testDonation._id}`)

    } catch (error) {
        console.error("Verification Script Failed:", error)
    } finally {
        await app.close()
    }
}

verifyFlow()
