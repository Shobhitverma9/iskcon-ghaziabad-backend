// @ts-nocheck
import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"
import { DonationService } from "./modules/donation/donation.service"

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule)
    const donationService = app.get(DonationService)

    console.log("Seeding Gau Seva Data...")

    try {
        // 1. Create Category
        const categoryData = {
            title: "Gau Seva",
            slug: "donate-gau-seva",
            description: "Protecting cows is one of the most important duties of human society.",
            image: "/images/donations/cow-service-gen.webp",
            order: 1, // High priority
        }

        // Check if exists or create
        let category: any
        const categories = await donationService.getCategories();
        category = categories.find(c => c.slug === categoryData.slug || c.title === categoryData.title);

        if (!category) {
            category = await donationService.createCategory(categoryData)
            console.log("Created Category: Gau Seva")
        } else {
            console.log("Category Gau Seva already exists. Updating...")
            category = await donationService.updateCategory(category._id, categoryData);
            // Clear existing items
            const existingItems = await donationService.getItemsByCategory(category._id);
            if (existingItems.length > 0) {
                console.log(`Clearing ${existingItems.length} existing items for Gau Seva...`);
                for (const item of existingItems) {
                    await donationService.deleteItem(item._id);
                }
            }
        }

        // 2. Create Items

        // Sub-Category: Maintenance
        const maintenanceItems = [
            { title: "One Day Cow Maintenance", defaultAmount: 5100 },
            { title: "Half Day Cow Maintenance", defaultAmount: 2500 },
        ]

        for (const item of maintenanceItems) {
            await donationService.createItem({
                title: item.title,
                defaultAmount: item.defaultAmount,
                category: category._id,
                subCategory: "Maintenance",
                description: "Support daily maintenance of a cow",
                image: "/images/donations/cow_care.webp"
            })
            console.log(`Created Item: ${item.title}`)
        }

        // Sub-Category: Feed Cows
        const feedItems = [
            { title: "Special Gau Pooja", defaultAmount: 551 },
            { title: "Green Fodder (100 kg)", defaultAmount: 1100 },
            { title: "Dry Fodder", defaultAmount: 1000 },
            { title: "Jaggery (Gur)", defaultAmount: 500 },
            { title: "Gau Gras", defaultAmount: 100 },
        ]

        for (const item of feedItems) {
            await donationService.createItem({
                title: item.title,
                defaultAmount: item.defaultAmount,
                category: category._id,
                subCategory: "Feed Cows",
                description: "Provide fodder for cows",
                image: "/images/donations/cow_feeding.webp"
            })
            console.log(`Created Item: ${item.title}`)
        }

        // Sub-Category: Adopt A Cow
        const adoptItems = [
            { title: "Adopt a Cow (Monthly)", defaultAmount: 3000 },
            { title: "Adopt a Cow (Yearly)", defaultAmount: 36000 },
            { title: "Adopt a Cow (Lifetime)", defaultAmount: 100000 },
        ]

        for (const item of adoptItems) {
            await donationService.createItem({
                title: item.title,
                defaultAmount: item.defaultAmount,
                category: category._id,
                subCategory: "Adopt A Cow",
                description: "Adopt a cow and support its life",
                image: "/images/donations/cow_care.webp"
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
