import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BlogService } from './modules/blog/blog.service';
import { CreateBlogDto } from './modules/blog/dto/create-blog.dto';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const blogService = app.get(BlogService);

    const blogs: CreateBlogDto[] = [
        {
            title: "The Essence of Bhagavad Gita",
            slug: "the-essence-of-bhagavad-gita",
            content: {
                time: 1704412800000,
                blocks: [
                    { type: "header", data: { text: "The Essence of Bhagavad Gita", level: 2 } },
                    { type: "paragraph", data: { text: "The Bhagavad Gita, often referred to as the Gita, is a 700-verse Hindu scripture that is part of the epic Mahabharata. It is set in a narrative framework of a dialogue between Pandava prince Arjuna and his guide and charioteer Krishna." } },
                    { type: "paragraph", data: { text: "At the start of the Dharma Yuddha (righteous war) between Pandavas and Kauravas, Arjuna is filled with moral dilemma and despair about the violence and death the war will cause in the battle against his own kin. He wonders if he should renounce and seeks Krishna's counsel." } },
                    { type: "quote", data: { text: "sarva-dharmān parityajya mām ekaṁ śaraṇaṁ vraja<br>ahaṁ tvāṁ sarva-pāpebhyo mokṣayiṣyāmi mā śucaḥ", caption: "Bhagavad Gita 18.66" } },
                    { type: "paragraph", data: { text: "Understanding these fundamental teachings helps us navigate the complexities of life with spiritual wisdom and inner peace." } }
                ]
            },
            featuredImage: "https://wallpapers.com/images/featured/bhagavad-gita-pictures-5c8t62t2o7b7w2e0.jpg",
            author: "Ramananda Raya Dasa",
            status: "published",
            seo: {
                title: "The Essence of Bhagavad Gita - Spiritual Wisdom",
                description: "Understanding the fundamental teachings of Lord Krishna in the Bhagavad Gita.",
                keywords: ["Bhagavad Gita", "Krishna", "Wisdom", "Philosophy"]
            },
            publishedAt: new Date("2024-01-05")
        },
        {
            title: "Upcoming Janmashtami Celebrations",
            slug: "upcoming-janmashtami-celebrations",
            content: {
                time: 1705276800000,
                blocks: [
                    { type: "header", data: { text: "Celebrate Janmashtami with Us!", level: 2 } },
                    { type: "paragraph", data: { text: "Join us for the grand celebration of Lord Krishna's appearance day (Janmashtami) at ISKCON Ghaziabad. It is the most auspicious day for all Vaishnavas." } },
                    { type: "list", data: { style: "unordered", items: ["Darshan Arati at Midnight", "Grand Kirtan", "Drama Performance", "Maha Prasadam for all"] } },
                    { type: "paragraph", data: { text: "Everyone is invited to participate in the festivities and receive the blessings of Lord Krishna. Please bring your family and friends." } }
                ]
            },
            featuredImage: "https://i.pinimg.com/736x/8e/d5/9b/8ed59b34ae92d952213562477328902d.jpg",
            author: "Temple Administration",
            status: "published",
            seo: {
                title: "Janmashtami Celebrations 2024 - ISKCON Ghaziabad",
                description: "Join us for the grand celebration of Lord Krishna's appearance day.",
                keywords: ["Janmashtami", "Festival", "Krishna", "Celebration"]
            },
            publishedAt: new Date("2024-01-15")
        },
        {
            title: "Community Service Highlights",
            slug: "community-service-highlights",
            content: {
                time: 1704153600000,
                blocks: [
                    { type: "header", data: { text: "Serving the Community", level: 2 } },
                    { type: "paragraph", data: { text: "We are happy to share a recap of our recent food distribution and community service events. 'Food for Life' is our flagship program where we distribute sanctified pure vegetarian food (Prasadam) to the needy." } },
                    { type: "image", data: { file: { url: "https://iskconnews.org/wp-content/uploads/2014/06/ffl.jpg" }, caption: "Food distribution drive" } },
                    { type: "paragraph", data: { text: "Over the last month, we have served over 5,000 meals in the Ghaziabad area. We thank all our volunteers and donors for their generous support." } }
                ]
            },
            featuredImage: "https://iskconnews.org/wp-content/uploads/2014/06/ffl.jpg",
            author: "Govind Dasa",
            status: "published",
            seo: {
                title: "Community Service & Food for Life - ISKCON Ghaziabad",
                description: "A recap of our recent food distribution and community service events.",
                keywords: ["Community Service", "Food for Life", "Charity", "Prasadam"]
            },
            publishedAt: new Date("2024-01-02")
        }
    ];

    console.log('Seeding blogs...');
    for (const blog of blogs) {
        const existing = await blogService.findBySlug(blog.slug);
        if (!existing) {
            await blogService.create(blog);
            console.log(`Created: ${blog.title}`);
        } else {
            console.log(`Skipped (Exists): ${blog.title}`);
        }
    }

    console.log('Seeding complete.');
    await app.close();
}

bootstrap();
