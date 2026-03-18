// @ts-nocheck
import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"
import { DonationService } from "./modules/donation/donation.service"

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule)
    const donationService = app.get(DonationService)

    console.log("Seeding Sri Vigrah Seva Data...")

    try {
        // 1. Create Category
        const categoryData = {
            title: "Sri Vigrah Seva",
            slug: "sri-vigrah-seva", // mapped to sri-vigrah-seva URL
            description: "Daily deity worship, also known as archanā or pūjā, holds significant importance in spiritual tradition of Vaishnavism.",
            image: "/IMG_2678.webp",
            order: 3,
        }

        // Check if exists or create
        let category: any
        const categories = await donationService.getCategories();
        // Look for slug match OR title match to be safe
        category = categories.find(c => c.slug === categoryData.slug || c.title === categoryData.title);

        if (!category) {
            category = await donationService.createCategory(categoryData)
            console.log("Created Category: Daily Deity Seva (sri-vigrah-seva)")
        } else {
            console.log("Category Daily Deity Seva already exists. Updating...")
            category = await donationService.updateCategory(category._id, categoryData);

            // Clear existing items to ensure clean state
            const existingItems = await donationService.getItemsByCategory(category._id);
            if (existingItems.length > 0) {
                console.log(`Clearing ${existingItems.length} existing items for Deity Seva...`);
                for (const item of existingItems) {
                    await donationService.deleteItem(item._id);
                }
            }
        }

        // 2. Create Items

        // Sub-Category: Flowers & Decoration
        const flowerItems = [
            { title: "Flowers Seva", amount: 501, img: "/images/donations/flowers_seva.webp" },
            { title: "Itra Seva", amount: 1100, img: "/images/donations/itra_seva.webp" },
            { title: "Garland Seva", amount: 2100, img: "/images/donations/garland_seva.webp" },
            { title: "Deity Altar Flower Decoration (Simple)", amount: 15001, img: "/images/donations/deity_decoration.webp" },
        ]

        for (const item of flowerItems) {
            await donationService.createItem({
                title: item.title,
                defaultAmount: item.amount,
                category: category._id,
                subCategory: "Flowers & Decoration",
                description: "Offering of fresh fragrant flowers and decoration.",
                image: item.img
            })
            console.log(`Created Item: ${item.title}`)
        }

        // Sub-Category: Aarti Services
        const aartiItems = [
            { title: "Mangal Aarti (4:30 am)", defaultAmount: 3501 },
            { title: "Raj Bhoga Aarti (12:00 pm)", defaultAmount: 3501 },
            { title: "Sandhya Aarti (7:00 pm)", defaultAmount: 3501 },
        ]

        for (const item of aartiItems) {
            await donationService.createItem({
                title: item.title,
                defaultAmount: item.defaultAmount,
                category: category._id,
                subCategory: "Aarti Services",
                description: "Daily Aarti Seva",
                image: "/images/donations/mangal_aarti.webp"
            })
            console.log(`Created Item: ${item.title}`)
        }

        // Sub-Category: Bhoga Services
        const bhogaItems = [
            { title: "Special Bhoga Offering", amount: 551, img: "/images/donations/raj_bhoga.webp" },
            { title: "Mangal Bhoga (4:14 am)", amount: 5501, img: "/images/donations/raj_bhoga.webp" },
            { title: "Raja Bhoga Seva (Lunch)", amount: 7555, img: "/images/donations/raja_bhoga_seva.webp" },
            { title: "Maha Bhoga Seva (56 Bhoga)", amount: 11001, img: "/images/donations/maha_bhoga_seva.webp" },
            { title: "Shayan Bhoga (8:00 pm)", amount: 3555, img: "/images/donations/raj_bhoga.webp" },
        ]

        for (const item of bhogaItems) {
            await donationService.createItem({
                title: item.title,
                defaultAmount: item.amount,
                category: category._id,
                subCategory: "Bhoga Services",
                description: "Offering of sanctified food (Prasadam).",
                image: item.img
            })
            console.log(`Created Item: ${item.title}`)
        }

        // Sub-Category: Special Services
        const specialItems = [
            { title: "Abhishek Seva", amount: 5100, img: "/images/donations/abhishek_seva.webp" },
            { title: "Purna Abhishek (Festival)", amount: 11001, img: "/images/donations/abhishek_seva.webp" },
            { title: "Divya Shringar (Day Dresses)", amount: 225001, img: "/images/donations/deity_decoration.webp" },
        ]

        for (const item of specialItems) {
            await donationService.createItem({
                title: item.title,
                defaultAmount: item.amount,
                category: category._id,
                subCategory: "Special Services",
                description: "Special Festival Seva & Dress offerings.",
                image: item.img
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
