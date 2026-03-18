// @ts-nocheck
import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"
import { DonationService } from "./modules/donation/donation.service"
import { getModelToken } from "@nestjs/mongoose"
import { DonationCategory } from "./modules/donation/schemas/donation-category.schema"

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule)

    // Direct model access might be easier if service doesn't have updateAll
    // But let's verify if we can access the model via standard DI
    // Actually, let's just use the service if it has update, or inject model.

    const categoryModel = app.get(getModelToken(DonationCategory.name));

    console.log("Repairing Categories: Setting isActive = true for all...");

    const result = await categoryModel.updateMany(
        { isActive: { $ne: true } },
        { $set: { isActive: true } }
    );

    console.log(`Matched ${result.matchedCount} documents and modified ${result.modifiedCount} documents.`);

    await app.close()
}

bootstrap()
