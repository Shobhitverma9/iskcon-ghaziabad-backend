import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BlogService } from './modules/blog/blog.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const blogService = app.get(BlogService);

    console.log('Fetching all blogs...');
    const result = await blogService.getAll(20, 0); // Get top 20

    console.log('--- Blog List (Title | PublishedAt | CreatedAt) ---');
    result.blogs.forEach(blog => {
        console.log(`"${blog.title}" | Published: ${blog.publishedAt} | Created: ${(blog as any).createdAt}`);
    });
    console.log('------------------------------------------------');

    await app.close();
}

bootstrap();
