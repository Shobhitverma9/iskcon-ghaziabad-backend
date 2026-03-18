// @ts-nocheck
import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"
import { CalendarService } from "./modules/calendar/calendar.service"

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule)
    const calendarService = app.get(CalendarService)

    console.log("Seeding Festival Data...")

    try {
        const events = [
            {
                title: "Vasant Panchami",
                date: "2026-01-23T00:00:00.000Z",
                description: "Vasant Panchami marks the arrival of spring and is celebrated with yellow flowers and clothes.",
                type: "festival",
                image: "/Annadaan1.jpg"
            },
            {
                title: "Nityananda Trayodasi",
                date: "2026-01-31T00:00:00.000Z",
                description: "Appearance day of Lord Nityananda, the most merciful incarnation.",
                type: "festival",
                image: "/Annadaan1.jpg"
            },
            {
                title: "Maha Shivratri",
                date: "2026-02-16T00:00:00.000Z",
                description: "Great night of Lord Shiva, observed with fasting and night-long vigil.",
                type: "festival",
                image: "/Annadaan1.jpg"
            },
            {
                title: "Gaura Purnima",
                date: "2026-03-03T00:00:00.000Z",
                description: "The divine appearance day of Sri Chaitanya Mahaprabhu.",
                type: "festival",
                image: "/Annadaan1.jpg"
            },
            {
                title: "Rama Navami",
                date: "2026-03-27T00:00:00.000Z",
                description: "Appearance day of Lord Rama.",
                type: "festival",
                image: "/Annadaan1.jpg"
            },
            {
                title: "Akshaya Tritiya",
                date: "2026-04-20T00:00:00.000Z",
                description: "A very auspicious day for starting new ventures.",
                type: "festival",
                image: "/Annadaan1.jpg"
            }
        ];

        for (const event of events) {
            await calendarService.createOrUpdate({
                ...event,
                meta: {},
                uid: `seed-${event.title.replace(/\s+/g, '-').toLowerCase()}-2026`
            })
            console.log(`Created/Updated Event: ${event.title}`)
        }

        console.log("Seeding Completed Successfully!")

    } catch (error) {
        console.error("Seeding Failed:", error)
    } finally {
        await app.close()
    }
}

bootstrap()
