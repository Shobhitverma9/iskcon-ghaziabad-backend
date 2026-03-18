import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BlogService } from './modules/blog/blog.service';
import * as cheerio from 'cheerio';

async function bootstrap() {
    console.log('Initializing NestJS Context for Blog Fix...');
    const app = await NestFactory.createApplicationContext(AppModule);
    const blogService = app.get(BlogService);

    try {
        console.log('Fetching all blogs...');
        // @ts-ignore
        const allBlogsData = await blogService.getAll(10000, 0);
        const blogs = allBlogsData.blogs || allBlogsData;

        if (!Array.isArray(blogs)) {
            console.error('Unexpected data format for blogs');
            return;
        }

        console.log(`Found ${blogs.length} blogs. checking for HTML entities...`);

        let updatedCount = 0;

        for (const blog of blogs) {
            let hasChanges = false;
            const originalTitle = blog.title;

            // Decode function using cheerio
            const decode = (str: string) => {
                if (!str) return str;
                try {
                    return cheerio.load(str).root().text();
                } catch (e) {
                    return str;
                }
            };

            // 1. Fix Title
            // @ts-ignore
            const decodedTitle = decode(blog.title);
            // @ts-ignore
            if (decodedTitle !== blog.title) {
                // @ts-ignore
                console.log(`[${blog._id}] Title changed: "${blog.title}" -> "${decodedTitle}"`);
                // @ts-ignore
                blog.title = decodedTitle;
                hasChanges = true;
            }

            // 2. Fix SEO
            // @ts-ignore
            if (blog.seo) {
                // @ts-ignore
                const decodedSeoTitle = decode(blog.seo.title);
                // @ts-ignore
                if (decodedSeoTitle !== blog.seo.title) {
                    // @ts-ignore
                    blog.seo.title = decodedSeoTitle;
                    hasChanges = true;
                }
                // @ts-ignore
                const decodedSeoDesc = decode(blog.seo.description);
                // @ts-ignore
                if (decodedSeoDesc !== blog.seo.description) {
                    // @ts-ignore
                    blog.seo.description = decodedSeoDesc;
                    hasChanges = true;
                }
            }

            // 3. Fix Content Blocks
            // @ts-ignore
            if (blog.content && Array.isArray(blog.content.blocks)) {
                // @ts-ignore
                for (const block of blog.content.blocks) {
                    // Header
                    if (block.type === 'header' && block.data?.text) {
                        const decodedHeader = decode(block.data.text);
                        if (decodedHeader !== block.data.text) {
                            block.data.text = decodedHeader;
                            hasChanges = true;
                        }
                    }
                    // Paragraph
                    if (block.type === 'paragraph' && block.data?.text) {
                        const decodedPara = decode(block.data.text);
                        if (decodedPara !== block.data.text) {
                            block.data.text = decodedPara;
                            hasChanges = true;
                        }
                    }
                    // Quote
                    if (block.type === 'quote' && block.data?.text) {
                        const decodedQuote = decode(block.data.text);
                        if (decodedQuote !== block.data.text) {
                            block.data.text = decodedQuote;
                            hasChanges = true;
                        }
                    }
                    // List
                    if (block.type === 'list' && Array.isArray(block.data?.items)) {
                        for (let i = 0; i < block.data.items.length; i++) {
                            let item = block.data.items[i];
                            if (typeof item === 'string') {
                                const decodedItem = decode(item);
                                if (decodedItem !== item) {
                                    block.data.items[i] = decodedItem;
                                    hasChanges = true;
                                }
                            } else if (item.content) {
                                // Handle object structure if exists
                                const decodedItem = decode(item.content);
                                if (decodedItem !== item.content) {
                                    block.data.items[i].content = decodedItem;
                                    hasChanges = true;
                                }
                            }
                        }
                    }
                }
            }

            if (hasChanges) {
                // We need to use update method. 
                // Since the service might not have a generic update that takes a full object replacement comfortably without strict DTOs (sometimes), 
                // we'll try to use the model if exposed or just call update with the changes.
                // Looking at service usage in migration: await blogService.create(payload) was used.
                // Let's try to find an update method or save the document if it's a mongoose doc.
                // The `getAll` usually returns POJOs or Documents.

                // Assuming blogService.update(id, dto) exists.
                // We'll construct a simplified update object.
                const updatePayload = {
                    title: blog.title,
                    seo: blog.seo,
                    content: blog.content
                };

                try {
                    // @ts-ignore
                    await blogService.update(blog._id, updatePayload);
                    updatedCount++;
                    console.log(`Updated blog: ${originalTitle}`);
                } catch (e) {
                    // @ts-ignore
                    console.error(`Failed to update blog ${blog._id}:`, e.message);
                }
            }
        }

        console.log(`\nFixed ${updatedCount} blogs.`);

    } catch (error) {
        console.error('Fix script failed:', error);
    } finally {
        await app.close();
    }
}

bootstrap();
