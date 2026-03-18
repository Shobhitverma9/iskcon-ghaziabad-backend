import { NestFactory } from '@nestjs/core';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { AppModule } from './app.module';
import { BlogService } from './modules/blog/blog.service';
import * as cheerio from 'cheerio';

// Node v18+ has native fetch, but we need to ensure type safety or just ignore it if TS complains
declare const fetch: any;

const WP_API_URL = 'https://iskconghaziabad.com/wp-json/wp/v2/posts?per_page=100&_embed';

async function bootstrap() {
    console.log('Initializing NestJS Context...');
    const app = await NestFactory.createApplicationContext(AppModule);
    const blogService = app.get(BlogService);

    try {
        console.log('Clearing existing blogs...');
        // Clear all existing blogs first
        const existingData = await blogService.getAll(10000, 0); // Increase limit
        const existingBlogs = existingData.blogs || existingData; // Handle return type

        if (Array.isArray(existingBlogs)) {
            for (const blog of existingBlogs) {
                const id = (blog as any)._id || (blog as any).id;
                await blogService.delete(id);
            }
        }
        console.log(`Cleared ${Array.isArray(existingBlogs) ? existingBlogs.length : 0} existing blogs.`);

        let page = 1;
        let hasMore = true;
        let totalMigrated = 0;

        while (hasMore) {
            const pagedUrl = `${WP_API_URL}&page=${page}`;
            console.log(`Fetching blogs from WordPress (Page ${page})...`);

            // @ts-ignore
            const wpRes = await fetch(pagedUrl);

            if (!wpRes.ok) {
                if (wpRes.status === 400) {
                    console.log('Reached end of pagination.');
                    hasMore = false;
                    break;
                }
                throw new Error(`Failed to fetch from WP: ${wpRes.statusText}`);
            }

            const wpPosts = await wpRes.json();
            if (!Array.isArray(wpPosts) || wpPosts.length === 0) {
                hasMore = false;
                break;
            }

            console.log(`Found ${wpPosts.length} posts on page ${page}.`);

            for (const post of wpPosts) {
                const featuredImage = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || '';
                const authorName = post._embedded?.['author']?.[0]?.name || 'ISKCON Ghaziabad';

                // Cheerio parsing and cleaning
                const $ = cheerio.load(post.content.rendered);

                // Fix Images: Restore src from lazy-load attributes
                $('img').each((_, el) => {
                    const $img = $(el);
                    const lazySrc = $img.attr('data-src') || $img.attr('data-lazy-src') || $img.attr('data-original');
                    if (lazySrc) {
                        $img.attr('src', lazySrc);
                    }
                    // Remove lazy loading attributes that might cause issues in new environment if JS is missing
                    $img.removeAttr('loading');
                    $img.removeAttr('srcset');
                    $img.removeAttr('sizes');
                    // Ensure max-width for better display
                    $img.addClass('w-full h-auto rounded-lg my-4');
                });



                // Clean unwanted attributes but keep essential ones
                $('*').each((_, el) => {
                    const $el = $(el);

                    // classes to keep
                    const classesToKeep = ['w-full', 'h-auto', 'rounded-lg', 'my-4'];
                    const currentClasses = ($el.attr('class') || '').split(/\s+/);
                    const keptClasses = currentClasses.filter(c => classesToKeep.includes(c));

                    $el.removeAttr('class');
                    if (keptClasses.length > 0) {
                        $el.addClass(keptClasses.join(' '));
                    }

                    $el.removeAttr('style'); // styling should be handled by CSS
                    $el.removeAttr('id');

                    // remove all data- attributes
                    const attrs = $el.attr();
                    if (attrs) {
                        Object.keys(attrs).forEach(attr => {
                            if (attr.startsWith('data-')) {
                                $el.removeAttr(attr);
                            }
                        });
                    }
                });

                // Unwrap useless containers
                $('div, span').each((_, el) => {
                    const $el = $(el);
                    if ($el.children().length === 0 && !$el.text().trim()) {
                        $el.remove();
                    }
                });


                const rawHtml = $('body').html() || '';

                // Map WP data to DTO
                // @ts-ignore
                const payload = {
                    title: cheerio.load(post.title.rendered).root().text(), // Decode entites like &amp; to &
                    slug: post.slug,
                    content: {
                        time: new Date(post.date).getTime(),
                        blocks: [
                            {
                                type: 'paragraph',
                                data: {
                                    text: cheerio.load(post.excerpt.rendered.replace(/<[^>]*>?/gm, '')).root().text()
                                }
                            },
                            {
                                type: 'html',
                                data: {
                                    html: rawHtml
                                }
                            }
                        ]
                    },
                    featuredImage: featuredImage,
                    author: authorName,
                    status: 'published',
                    publishedAt: new Date(post.date).toISOString(), // Service likely expects Date object or string
                    seo: {
                        title: post.yoast_head_json?.title ? cheerio.load(post.yoast_head_json.title).root().text() : cheerio.load(post.title.rendered).root().text(),
                        description: post.yoast_head_json?.description ? cheerio.load(post.yoast_head_json.description).root().text() : cheerio.load(post.excerpt.rendered.replace(/<[^>]*>?/gm, '')).root().text(),
                        keywords: []
                    }
                };

                // Fix date if DTO expects Date object
                // @ts-ignore
                payload.publishedAt = new Date(post.date);

                console.log(`Migrating: ${payload.title} (${(payload.publishedAt as any).toISOString()})`);
                try {
                    // Check if exists by slug to avoid duplicates
                    const existing = await blogService.findBySlug(payload.slug);
                    if (existing) {
                        await blogService.delete((existing as any)._id); // Re-import: Delete existing to update content
                        // @ts-ignore
                        await blogService.create(payload);
                        totalMigrated++;
                        console.log('Replaced existing blog.');
                    } else {
                        // @ts-ignore
                        await blogService.create(payload);
                        totalMigrated++;
                    }
                } catch (err) {
                    console.error(`Failed to migrate ${payload.title}:`, err.message);
                }
            }
            page++;
        }

        console.log(`Migration complete. Total blogs migrated: ${totalMigrated}`);

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await app.close();
    }
}

bootstrap();
