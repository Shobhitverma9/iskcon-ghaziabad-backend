// @ts-nocheck
import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"
import { getModelToken } from "@nestjs/mongoose"
import { PujaItem } from "./modules/pooja/schemas/puja-item.schema"

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule)

    // Inject the PujaItem model
    const pujaItemModel = app.get(getModelToken(PujaItem.name));

    console.log("Repairing Pooja Items: Setting isActive = true for all...");

    // Update all items where isActive is not true (missing or false)
    const result = await pujaItemModel.updateMany(
        { isActive: { $ne: true } },
        { $set: { isActive: true } }
    );

    console.log(`Matched ${result.matchedCount} documents and modified ${result.modifiedCount} documents.`);

    await app.close()
}

bootstrap()
