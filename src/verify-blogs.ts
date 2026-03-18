import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BlogService } from './modules/blog/blog.service';

async function bootstrap() {
    console.log('Verifying blogs...');
    const app = await NestFactory.createApplicationContext(AppModule);
    const blogService = app.get(BlogService);

    const data = await blogService.getAll(1000, 0);
    const blogs = Array.isArray(data) ? data : (data.blogs || []);

    console.log(`Total blogs in DB: ${blogs.length}`);
    if (blogs.length > 0) {
        console.log('Sample titles:');
        blogs.slice(0, 5).forEach(b => console.log(`- ${b.title}`));
    }

    await app.close();
}

bootstrap();
