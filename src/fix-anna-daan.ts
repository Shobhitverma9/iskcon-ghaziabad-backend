
// @ts-nocheck
import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"
import { DonationService } from "./modules/donation/donation.service"
import { DonationItem } from "./modules/donation/schemas/donation-item.schema"
import { Model } from "mongoose"
import { getModelToken } from "@nestjs/mongoose"

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule)
    const donationService = app.get(DonationService)
    const itemModel = app.get<Model<any>>(getModelToken(DonationItem.name))

    console.log("Fixing Anna Daan Data...")

    try {
        const categories = await donationService.getCategories({ slug: "anna-daan" });
        const category = categories[0];

        if (!category) {
            console.log("Category 'anna-daan' NOT FOUND");
        } else {
            console.log("Category Found:", category.title);

            // 1. Update Category to be active
            await donationService.updateCategory((category as any)._id, { isActive: true });
            console.log("Updated Category to isActive: true");

            // 2. Find and Update Items
            const items = await donationService.getItemsByCategory((category as any)._id);
            console.log(`Found ${items.length} items.`);

            // Bulk update matching items
            const result = await itemModel.updateMany(
                { category: (category as any)._id },
                { $set: { isActive: true } }
            );

            console.log(`Updated ${result.modifiedCount} items to isActive: true`);

            // Verify
            const updatedItems = await donationService.getItemsByCategory((category as any)._id);
            updatedItems.forEach(item => {
                console.log(`Item: ${item.title}, isActive: ${item.isActive}`);
            });
        }

    } catch (error) {
        console.error("Fix Failed:", error)
    } finally {
        await app.close()
    }
}

bootstrap()
