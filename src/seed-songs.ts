import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"
import { SongsService } from "./modules/songs/songs.service"
import { SongCategoriesService } from "./modules/song-categories/song-categories.service"

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule)
    const songsService = app.get(SongsService)
    const categoriesService = app.get(SongCategoriesService)

    const categories = [
        "Pranam Mantras",
        "Temple Programe Prayers",
        "Bhajans by Bhaktivinoda Thakur",
        "Bhajans by Narottam Das Thakur",
        "Bhajans by Lochan Das Thakur",
        "Bhajans by Bhaktisiddhanta Saraswati Thakura",
        "Bhajans by Krsna Daipayana Vyasa",
        "Bhajans by Vasudeva Ghosh",
        "Bhajans by Rupa Goswami",
        "Bhajans by Raghunath Dasa Goswami",
        "Bhajans by Jayadeva Goswami",
        "Bhajans by Srinivas Acharya",
        "Bhajans by Govinda Das Kaviraj",
        "Bhajans by Sarvabhaum Bhattacharya",
        "Bhajans by H D G A C Bhaktivedanta Swami Prabhupada",
        "Bhajans by Vishwanath Chakravarti Thakura",
        "Bhajans by Krsnadasa Kaviraja Goswami",
        "Bhajans by Vrindavan Das Thakura",
        "Bhajans by Devakinandan Das Thakur",
        "Bhajans by Adi Shankaracharya",
        "Bhajans by Bilvamangala Thakura",
        "Bhajans by Jiva Goswami",
        "Bhajans by others",
        "Vaishnava Bhajans In Alphabetical Order"
    ]

    console.log("Seeding Categories...")
    const categoryMap = new Map<string, string>(); // slug -> id

    for (let i = 0; i < categories.length; i++) {
        const title = categories[i];
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

        try {
            let category = await categoriesService.findOne(slug).catch(() => null);
            if (!category) {
                category = await categoriesService.create({
                    title,
                    slug,
                    order: i,
                    isActive: true
                });
                console.log(`Created Category: ${title}`);
            } else {
                await categoriesService.update((category as any)._id, { order: i, title });
                console.log(`Updated Category: ${title}`);
            }
            categoryMap.set(slug, (category as any)._id.toString());
        } catch (err) {
            console.error(`Error processing category ${title}:`, err);
        }
    }

    // Songs using category slugs mapping
    const songs = [
        {
            title: "Sri Guru Vandana",
            author: "Srila Narottam Das Thakur",
            categorySlug: "bhajans-by-narottam-das-thakur",
            audioUrl: "https://audio.iskcondesiretree.com/01_-_Srila_Prabhupada/02_-_Bhajans/Vol-01/02_-_Hare_Krsna_Classics_and_Originals/SP_Bhajans_06_-_Samsara_Davanala_-_Sri_Sri_Gurv-astakam.mp3",
            slug: "sri-guru-vandana",
            lyrics: {
                devanagari: "श्री गुरु चरण पद्म, केवल भक्ति सद्म, वन्दों मुइ सावधान मते।\nजाहार प्रसादे भाइ, ए भव तड़िया जाइ, कृष्ण प्राप्ति होय जाहा हते॥",
                iast: "śrī-guru-caraṇa-padma, kevala-bhakti-sadma, vando mui sāvadhāna mate\njāhāra prasāde bhāi, e bhava toriyā jāi, kṛṣṇa-prāpti hoy jāhā ha'te",
                english: "The lotus feet of the spiritual master are the only way by which we can attain pure devotional service. I bow to his lotus feet with great awe and reverence. By his grace one can cross the ocean of material suffering and obtain the mercy of Krishna.",
            },
            duration: 300,
        },
        {
            title: "Jaya Radha Madhava",
            author: "Srila Bhaktivinoda Thakur",
            categorySlug: "bhajans-by-bhaktivinoda-thakur",
            audioUrl: "https://audio.iskcondesiretree.com/01_-_Srila_Prabhupada/02_-_Bhajans/Vol-01/02_-_Hare_Krsna_Classics_and_Originals/SP_Bhajans_03_-_Jaya_Radha_Madhava.mp3",
            slug: "jaya-radha-madhava",
            lyrics: {
                devanagari: "जय राधा-माधव, जय कुंज-बिहारी\nजय गोपी-जन-वल्लभ, जय गिरि-वर-धारी",
                iast: "jaya rādhā-mādhava, jaya kuñja-bihārī\njaya gopī-jana-vallabha, jaya giri-vara-dhārī",
                english: "Krishna is the lover of Radha. He displays many amorous pastimes in the groves of Vrindavana, He is the lover of the cowherd maidens of Vraja, the holder of the great hill named Govardhana.",
            },
            duration: 240,
        },
    ]

    console.log("Seeding Songs...")
    for (const song of songs) {
        try {
            const categoryId = categoryMap.get(song.categorySlug);
            if (!categoryId) {
                console.warn(`Category not found for song ${song.title} (slug: ${song.categorySlug})`);
                continue;
            }

            const songData = {
                ...song,
                category: categoryId // Assign the ObjectId key
            };

            // Remove helper prop
            delete (songData as any).categorySlug;

            const existing = await songsService.findOne(song.slug).catch(() => null);
            if (existing) {
                await songsService.update((existing as any)._id.toString(), songData)
                console.log(`Updated song: ${song.title}`)
            } else {
                await songsService.create(songData as any)
                console.log(`Created song: ${song.title}`)
            }
        } catch (error) {
            console.log(`Skipped song ${song.title}: ${String(error)}`)
        }
    }

    await app.close()
}

bootstrap()
