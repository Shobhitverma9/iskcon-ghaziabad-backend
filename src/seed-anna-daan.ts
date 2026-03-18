// @ts-nocheck
import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"
import { DonationService } from "./modules/donation/donation.service"

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule)
    const donationService = app.get(DonationService)

    console.log("Seeding Anna Daan Data...")

    try {
        // 1. Create Category
        const categoryData = {
            title: "Anna Daan",
            slug: "anna-daan",
            description: "Anna Daan, or the donation of food to the needy, is one of the most virtuous acts in Vedic culture.",
            image: "/images/donations/anna_daan_banner.webp",
            order: 2, // Assuming existing are 1
            isActive: true,
        }

        // Check if exists or create
        let category: any
        const categories = await donationService.getCategories();
        category = categories.find(c => c.slug === categoryData.slug);

        if (!category) {
            category = await donationService.createCategory(categoryData)
            console.log("Created Category: Anna Daan")
        } else {
            console.log("Category Anna Daan already exists. Updating...")
            category = await donationService.updateCategory(category._id, categoryData);

            // Clear existing items to ensure precise list
            const existingItems = await donationService.getItemsByCategory(category._id);
            if (existingItems.length > 0) {
                console.log(`Clearing ${existingItems.length} existing items for Anna Daan...`);
                for (const item of existingItems) {
                    await donationService.deleteItem(item._id);
                }
            }
        }

        // 2. Create Items
        // Sub-Category: Anna Daan
        const annaDaanItems = [
            { title: "51 Plates of Prasadam", defaultAmount: 551 },
            { title: "101 Plates of Prasadam", defaultAmount: 1101 },
            { title: "Donate 20 Meals", defaultAmount: 1000 },
            { title: "Donate 100 Meals", defaultAmount: 5000 },
            { title: "Donate 400 Meals", defaultAmount: 20000 },
            { title: "Donate 1000 Meals", defaultAmount: 50000 },
        ]

        for (const item of annaDaanItems) {
            await donationService.createItem({
                title: item.title,
                defaultAmount: item.defaultAmount,
                category: category._id,
                subCategory: "Anna Daan",
                description: "Food distribution for the needy",
                image: "/images/donations/anna_daan_plate.webp", // Updated WebP image
                isActive: true
            })
            console.log(`Created Item: ${item.title}`)
        }

        // Sub-Category: Khichdi Prasadam
        const khichdiItems = [
            { title: "100 People Khichdi", defaultAmount: 1100 },
            { title: "Full Day Khichdi", defaultAmount: 11000 },
            { title: "One Week Khichdi", defaultAmount: 77000 },
            { title: "One Month Khichdi", defaultAmount: 330000 },
        ]

        for (const item of khichdiItems) {
            await donationService.createItem({
                title: item.title,
                defaultAmount: item.defaultAmount,
                category: category._id,
                subCategory: "Khichdi Prasadam",
                description: "Distribution of nutritious Khichdi Prasadam",
                image: "/images/donations/anna_daan_pot.webp", // Updated WebP image
                isActive: true
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
