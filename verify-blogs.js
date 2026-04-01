const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const uri = process.env.MONGODB_URI || process.env.DATABASE_URL || process.env.MONGO_URI;

async function verify() {
    try {
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        // Check the blog_posts collection
        const blogs = await mongoose.connection.db.collection('blog_posts').find({
            publishedAt: {
                $gte: new Date('2026-01-08'),
                $lte: new Date('2026-02-06')
            }
        }).toArray();

        console.log(`\nVerified ${blogs.length} blogs in the 'blog_posts' collection for the requested range:\n`);

        blogs.forEach(b => {
            console.log(`- Title: ${b.title}`);
            console.log(`  Slug:  ${b.slug}`);
            console.log(`  Date:  ${b.publishedAt.toISOString().split('T')[0]}`);
            console.log(`  Blocks: ${b.content?.blocks?.length || 0}`);
            console.log('');
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error('Verification failed:', err);
        process.exit(1);
    }
}

verify();
