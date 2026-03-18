// @ts-nocheck
import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"
import { DonationService } from "./modules/donation/donation.service"

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule)
    const donationService = app.get(DonationService)

    console.log("Seeding Wave City Construction Data...")

    try {
        // 1. Create Category
        const categoryData = {
            title: "Wave City Construction",
            slug: "wave-city-construction",
            description: "Support the construction of the monumental ISKCON temple in Wave City, Ghaziabad.",
            image: "/img10.webp",
            order: 5,
            isActive: true,
        }

        // Check if exists or create
        let category: any
        const categories = await donationService.getCategories();
        category = categories.find(c => c.slug === categoryData.slug);

        if (!category) {
            category = await donationService.createCategory(categoryData)
            console.log("Created Category: Wave City Construction")
        } else {
            console.log("Category Wave City Construction already exists. Updating...")
            category = await donationService.updateCategory(category._id, categoryData);

            // Clear existing items to ensure precise list
            const existingItems = await donationService.getItemsByCategory(category._id);
            if (existingItems.length > 0) {
                console.log(`Clearing ${existingItems.length} existing items for Wave City...`);
                for (const item of existingItems) {
                    await donationService.deleteItem(item._id);
                }
            }
        }

        // 2. Create Items
        const waveCityItems = [
            {
                title: "Sponsor a Brick",
                defaultAmount: 1000,
                fundId: 101,
                description: "Lay the foundation of the temple with your devotion.",
                image: "/images/donations/book-distribution.webp"
            },
            {
                title: "Sponsor 1 Sq. Ft.",
                defaultAmount: 5100,
                fundId: 102,
                description: "Build a sacred space for the Lord and His devotees.",
                image: "/img10.webp"
            },
            {
                title: "Sponsor a Pillar",
                defaultAmount: 100000,
                fundId: 103,
                description: "Be the strength that supports the temple structure.",
                image: "/images/donations/temple-cleaning.webp"
            },
        ]

        for (const item of waveCityItems) {
            await donationService.createItem({
                title: item.title,
                defaultAmount: item.defaultAmount,
                category: category._id,
                subCategory: "Temple Construction",
                description: item.description,
                image: item.image,
                isActive: true,
                metadata: { fundId: item.fundId }
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
