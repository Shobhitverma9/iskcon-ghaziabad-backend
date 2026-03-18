
import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"
import { DonationService } from "./modules/donation/donation.service"

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule)
    const donationService = app.get(DonationService)

    console.log("Checking Anna Daan Data...")

    try {
        const categories = await donationService.getCategories({ slug: "anna-daan" });
        const category = categories[0];

        if (!category) {
            console.log("Category 'anna-daan' NOT FOUND");
        } else {
            console.log("Category Found:", JSON.stringify(category, null, 2));

            const items = await donationService.getItemsByCategory((category as any)._id);
            console.log(`Found ${items.length} items for this category.`);

            items.forEach((item: any) => {
                console.log(`Item: ${item.title}, isActive: ${item.isActive}`);
                // detailed check
                console.log(JSON.stringify(item, null, 2));
            });
        }

    } catch (error) {
        console.error("Check Failed:", error)
    } finally {
        await app.close()
    }
}

bootstrap()
