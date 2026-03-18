import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BlogService } from './modules/blog/blog.service';
import * as fs from 'fs';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const blogService = app.get(BlogService);

    console.log('Fetching latest blog...');
    const result = await blogService.getAll(1, 0, 'published'); // Get top 1 published

    let output = '';
    if (result.blogs.length > 0) {
        const blog = result.blogs[0];
        output += '--- Latest Blog Debug ---\n';
        output += `Title: ${blog.title}\n`;
        output += `Featured Image: '${blog.featuredImage}'\n`;
        output += `Published At: ${blog.publishedAt}\n`;
        output += '-------------------------\n';
    } else {
        output += 'No blogs found.\n';
    }

    fs.writeFileSync('debug-output.txt', output);
    console.log('Debug output written to debug-output.txt');

    await app.close();
}

bootstrap();
