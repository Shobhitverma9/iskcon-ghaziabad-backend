// @ts-nocheck
import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"
import { PoojaService } from "./modules/pooja/pooja.service"

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule)
    console.log("Seeding Pooja Plates and Items...")

    try {
        const poojaService = app.get(PoojaService);

        const items = [
            // Ready-Made Pooja Plates
            {
                title: "Panchashat Puja",
                description: "56 Tulsi Leaves or no of Flowers • 7 Wick Ghee Lamp • 5 Dry Fruits (100gm Each) • 4 Fruits • Coconut • Sweet (2 Laddu)",
                price: 2100,
                image: "/images/2100.png",
                category: "Ready-Made Plates",
                type: "plate",
                isActive: true
            },
            {
                title: "Chaturvimshati Puja",
                description: "24 Tulsi Leaves or no of Flowers • 5 Wick Ghee Lamp • 1 Dry Fruit (250gm Each) • 4 Fruits • Coconut • Sweet (2 Laddu)",
                price: 1100,
                image: "/images/1100.png",
                category: "Ready-Made Plates",
                type: "plate",
                isActive: true
            },
            {
                title: "Dwadasha Nama Puja",
                description: "12 Tulsi Leaves or no of Flowers • Single Wick Ghee Lamp • 2 Fruits • Coconut • Sweet (2 Laddu)",
                price: 501,
                image: "/images/501.png",
                category: "Ready-Made Plates",
                type: "plate",
                isActive: true
            },
            {
                title: "Puja Archana Puja",
                description: "Single Wick Ghee Lamp • 2 Fruits • Sweet (2 Laddu) • Tulsi Leaves or Flowers",
                price: 251,
                image: "/images/251.png",
                category: "Ready-Made Plates",
                type: "plate",
                isActive: true
            },

            // Individual Items - Garlands
            {
                title: "Marigold Garland",
                description: "Fresh marigold garland for deity worship",
                price: 151,
                image: "/images/garland-1.png",
                category: "Offering of Divine Garland",
                type: "item",
                isActive: true
            },
            {
                title: "Tulsi Garland",
                description: "Sacred Tulsi garland",
                price: 251,
                image: "/images/garland-2.png",
                category: "Offering of Divine Garland",
                type: "item",
                isActive: true
            },

            // Individual Items - Tulsi Leaves
            {
                title: "21 Tulsi Leaves",
                description: "Sacred Tulsi leaves for offering",
                price: 101,
                image: "/images/tulsi-1.png",
                category: "Sacred Offering of Tulsi Leaves",
                type: "item",
                isActive: true
            },
            {
                title: "56 Tulsi Leaves",
                description: "Sacred Tulsi leaves for offering",
                price: 201,
                image: "/images/tulsi-1.png",
                category: "Sacred Offering of Tulsi Leaves",
                type: "item",
                isActive: true
            },

            // Individual Items - Lamps
            {
                title: "Single Wick Ghee Lamp",
                description: "Traditional ghee lamp with single wick",
                price: 51,
                image: "/images/pooja/ghee_lamp.webp",
                category: "Divine Lamps",
                type: "item",
                isActive: true
            },
            {
                title: "5 Wick Ghee Lamp",
                description: "Traditional ghee lamp with 5 wicks",
                price: 151,
                image: "/images/pooja/ghee_lamp.webp",
                category: "Divine Lamps",
                type: "item",
                isActive: true
            },
            {
                title: "7 Wick Ghee Lamp",
                description: "Traditional ghee lamp with 7 wicks",
                price: 201,
                image: "/images/pooja/ghee_lamp.webp",
                category: "Divine Lamps",
                type: "item",
                isActive: true
            },

            // Individual Items - Fruits
            {
                title: "2 Fruits",
                description: "Fresh seasonal fruits for offering",
                price: 101,
                image: "/images/pooja/fruits.webp",
                category: "Fresh Fruits Offering",
                type: "item",
                isActive: true
            },
            {
                title: "4 Fruits",
                description: "Fresh seasonal fruits for offering",
                price: 201,
                image: "/images/pooja/fruits.webp",
                category: "Fresh Fruits Offering",
                type: "item",
                isActive: true
            },

            // Individual Items - Dry Fruits
            {
                title: "1 Dry Fruit (250gm)",
                description: "Premium dry fruits for offering",
                price: 251,
                image: "/images/pooja/dry_fruits.webp",
                category: "Dry Fruits Offering",
                type: "item",
                isActive: true
            },
            {
                title: "5 Dry Fruits (100gm Each)",
                description: "Assorted premium dry fruits for offering",
                price: 501,
                image: "/images/pooja/dry_fruits.webp",
                category: "Dry Fruits Offering",
                type: "item",
                isActive: true
            },

            // Individual Items - Sweets
            {
                title: "Sweet (2 Laddu)",
                description: "Traditional laddu for offering",
                price: 101,
                image: "/images/pooja/laddu.webp",
                category: "Sweet Offerings",
                type: "item",
                isActive: true
            },

            // Individual Items - Coconut
            {
                title: "Coconut",
                description: "Fresh coconut for offering",
                price: 51,
                image: "/images/pooja/coconut.webp",
                category: "Sacred Offerings",
                type: "item",
                isActive: true
            }
        ];

        // Clear existing items
        const existingItems = await poojaService.findAllItems();
        if (existingItems.length > 0) {
            console.log(`Found ${existingItems.length} existing items. Clearing them to ensure fresh seed...`);
            for (const item of existingItems) {
                await poojaService.deleteItem(item._id);
            }
            console.log("Cleared all existing items.");
        }

        // Create new items
        for (const item of items) {
            await poojaService.createItem(item);
            console.log(`Created Item: ${item.title} - ₹${item.price}`);
        }

        console.log("\n✅ Pooja Plates and Items Seeding Completed Successfully!")
        console.log(`Total items created: ${items.length}`)
        console.log(`- Plates: ${items.filter(i => i.type === 'plate').length}`)
        console.log(`- Individual Items: ${items.filter(i => i.type === 'item').length}`)

    } catch (error) {
        console.error("❌ Seeding Failed:", error)
    } finally {
        await app.close()
    }
}

bootstrap()
