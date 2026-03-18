// @ts-nocheck
import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"
import { DonationService } from "./modules/donation/donation.service"

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule)
    const donationService = app.get(DonationService)

    console.log("Seeding Guardian of Temple Data...")

    try {
        // 1. Create Category
        const categoryData = {
            title: "Guardian of Temple",
            slug: "guardian-of-temple",
            description: "Become a Guardian of the Temple by contributing just ₹1 per day. Your support helps maintain the sacred temple, support daily worship, and preserve our spiritual heritage.",
            image: "https://res.cloudinary.com/ddcfe7ux2/image/upload/v1773670902/banners/1773670898598-254574481.webp",
            order: 4,
            isActive: true,
        }

        // Check if exists or create
        let category: any
        const categories = await donationService.getCategories();
        category = categories.find(c => c.slug === categoryData.slug);

        if (!category) {
            category = await donationService.createCategory(categoryData)
            console.log("Created Category: Guardian of Temple")
        } else {
            console.log("Category Guardian of Temple already exists. Updating...")
            category = await donationService.updateCategory(category._id, categoryData);

            // Clear existing items to ensure precise list
            const existingItems = await donationService.getItemsByCategory(category._id);
            if (existingItems.length > 0) {
                console.log(`Clearing ${existingItems.length} existing items for Guardian of Temple...`);
                for (const item of existingItems) {
                    await donationService.deleteItem(item._id);
                }
            }
        }

        // 2. Create Items
        // Sub-Category: Temple Maintenance - Tiered Plans
        const maintenanceItems = [
            { title: "Basic Guardian", defaultAmount: 30 },
            { title: "Silver Guardian", defaultAmount: 100 },
            { title: "Gold Guardian", defaultAmount: 500 },
            { title: "Platinum Guardian", defaultAmount: 1000 },
            { title: "Diamond Guardian", defaultAmount: 5000 },
        ]

        for (const item of maintenanceItems) {
            await donationService.createItem({
                title: item.title,
                defaultAmount: item.defaultAmount,
                category: category._id,
                subCategory: "Temple Maintenance",
                description: "Support daily temple operations and maintenance",
                image: "https://res.cloudinary.com/ddcfe7ux2/image/upload/v1773670902/banners/1773670898598-254574481.webp",
                isActive: true
            })
            console.log(`Created Item: ${item.title}`)
        }

        // Sub-Category: Deity Services
        const deityItems = [
            { title: "Daily Deity Seva", defaultAmount: 501 },
            { title: "Weekly Deity Seva", defaultAmount: 3501 },
            { title: "Monthly Deity Seva", defaultAmount: 15001 },
            { title: "Annual Deity Seva", defaultAmount: 180001 },
        ]

        for (const item of deityItems) {
            await donationService.createItem({
                title: item.title,
                defaultAmount: item.defaultAmount,
                category: category._id,
                subCategory: "Deity Services",
                description: "Support daily worship and deity services",
                image: "https://res.cloudinary.com/ddcfe7ux2/image/upload/v1773670902/banners/1773670898598-254574481.webp",
                isActive: true
            })
            console.log(`Created Item: ${item.title}`)
        }

        // Sub-Category: Infrastructure Development
        const infrastructureItems = [
            { title: "Temple Beautification", defaultAmount: 5000 },
            { title: "Facility Upgrade", defaultAmount: 25000 },
            { title: "Major Infrastructure", defaultAmount: 100000 },
            { title: "Temple Expansion", defaultAmount: 500000 },
        ]

        for (const item of infrastructureItems) {
            await donationService.createItem({
                title: item.title,
                defaultAmount: item.defaultAmount,
                category: category._id,
                subCategory: "Infrastructure Development",
                description: "Support temple infrastructure and development",
                image: "https://res.cloudinary.com/ddcfe7ux2/image/upload/v1773725687/banners/1773725682594-458327008.webp",
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
