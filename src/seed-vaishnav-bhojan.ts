// @ts-nocheck
import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"
import { DonationService } from "./modules/donation/donation.service"

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule)
    const donationService = app.get(DonationService)

    console.log("Seeding Vaishnav Bhojan Data...")

    try {
        // 1. Create Category
        const categoryData = {
            title: "Vaishnav Bhojan",
            slug: "vaishnav-bhojan",
            description: "Sponsor meals for Vaishnavs and devotees.",
            image: "/images/donations/vaishnav-bhojan-gen.webp",
            order: 4,
        }

        // Check if exists or create
        let category: any
        const categories = await donationService.getCategories();
        category = categories.find(c => c.slug === categoryData.slug);

        if (!category) {
            category = await donationService.createCategory(categoryData)
            console.log("Created Category: Vaishnav Bhojan")
        } else {
            console.log("Category Vaishnav Bhojan already exists. Updating...")
            category = await donationService.updateCategory(category._id, categoryData);
            // Clear existing items
            const existingItems = await donationService.getItemsByCategory(category._id);
            if (existingItems.length > 0) {
                console.log(`Clearing ${existingItems.length} existing items for Vaishnav Bhojan...`);
                for (const item of existingItems) {
                    await donationService.deleteItem(item._id);
                }
            }
        }

        // 2. Create Items (Placeholder Items)
        const items = [
            { title: "Sponsor 5 Vaishnav Meals", defaultAmount: 551 },
            { title: "Sponsor 11 Vaishnav Meals", defaultAmount: 1101 },
            { title: "Sponsor 21 Vaishnav Meals", defaultAmount: 2101 },
            { title: "Sponsor 25 Vaishnav Meals", defaultAmount: 11001 },
            { title: "Sponsor 50 Vaishnav Meals", defaultAmount: 21001 },
            { title: "Sponsor 100 Vaishnav Meals", defaultAmount: 41001 },
            { title: "Full Feast for All Devotees", defaultAmount: 100001 },
        ]

        for (const item of items) {
            await donationService.createItem({
                title: item.title,
                defaultAmount: item.defaultAmount,
                category: category._id,
                subCategory: "Vaishnav Bhojan",
                description: "Vaishnav Seva",
                image: "/images/donations/sadhu_bhojan.webp"
            })
            console.log(`Created Item: ${item.title}`)
        }

        console.log("Seeding Completed Successfully!")

    } catch (error) {
        console.error("Seeding Failed:", error)
    } finally {
        await app.close()
    }
}

bootstrap()
