import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BlogService } from './modules/blog/blog.service';
import { BlogPost } from './modules/blog/schemas/blog.schema';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const blogModel = app.get<Model<BlogPost>>(getModelToken(BlogPost.name));

    console.log('Checking for blogs with missing publishedAt...');

    // Find blogs where publishedAt is null or doesn't exist
    const blogsToFix = await blogModel.find({
        $or: [
            { publishedAt: { $exists: false } },
            { publishedAt: null }
        ]
    }).exec();

    console.log(`Found ${blogsToFix.length} blogs to fix.`);

    for (const blog of blogsToFix) {
        // Use createdAt as fallback, or current date if created at is missing (unlikely)
        const newDate = (blog as any).createdAt || new Date();
        console.log(`Fixing "${blog.title}". Setting publishedAt to ${newDate}`);

        blog.publishedAt = newDate;
        await blog.save();
    }

    console.log('Date fix complete.');
    await app.close();
}

bootstrap();
