import { NestFactory } from '@nestjs/core';
import { v2 as cloudinary } from 'cloudinary';
import axios from 'axios';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { AppModule } from './app.module';
import { BlogService } from './modules/blog/blog.service';
import { ConfigService } from '@nestjs/config';
import * as cheerio from 'cheerio';

declare const fetch: any;

const WP_API_URL = 'https://iskconghaziabad.co.in/wp-json/wp/v2/posts?per_page=100&_embed';

async function uploadToCloudinary(url: string, folder: string = 'blogs'): Promise<string> {
    if (!url) return '';
    // Skip if already on Cloudinary
    if (url.includes('cloudinary.com')) return url;
    
    try {
        console.log(`     📸 Uploading image: ${url.substring(0, 50)}...`);
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);

        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: folder,
                    resource_type: 'image',
                    overwrite: true,
                },
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result.secure_url);
                }
            );
            uploadStream.end(buffer);
        });
    } catch (err) {
        console.error(`     ⚠️  Failed to upload image ${url}: ${err.message}`);
        return url; // Fallback to original URL if upload fails
    }
}

async function bootstrap() {
    console.log('Initializing NestJS Context for FULL MIGRATION...');
    const app = await NestFactory.createApplicationContext(AppModule);
    const blogService = app.get(BlogService);
    const configService = app.get(ConfigService);

    // Initialize Cloudinary
    cloudinary.config({
        cloud_name: configService.get('CLOUDINARY_CLOUD_NAME'),
        api_key:    configService.get('CLOUDINARY_API_KEY'),
        api_secret: configService.get('CLOUDINARY_API_SECRET'),
    });

    try {
        let page = 1;
        let hasMore = true;
        let totalMigrated = 0;

        console.log(`\nStarting FULL Migration (with Cloudinary Uploads) for all blogs\n`);

        while (hasMore) {
            const pagedUrl = `${WP_API_URL}&page=${page}`;
            console.log(`Fetching page ${page}...`);

            // @ts-ignore
            const wpRes = await fetch(pagedUrl);

            if (!wpRes.ok) {
                if (wpRes.status === 400) {
                    console.log('No more pages.');
                    hasMore = false;
                    break;
                }
                throw new Error(`WP API error: ${wpRes.status} ${wpRes.statusText}`);
            }

            const wpPosts = await wpRes.json();

            if (!Array.isArray(wpPosts) || wpPosts.length === 0) {
                hasMore = false;
                break;
            }

            console.log(`  Found ${wpPosts.length} posts on page ${page}.`);

            for (const post of wpPosts) {
                let featuredImage = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || '';
                const authorName    = post._embedded?.['author']?.[0]?.name || 'ISKCON Ghaziabad';

                console.log(`  → Processing: "${post.title.rendered}"`);

                // 1. Handle Featured Image
                if (featuredImage) {
                    featuredImage = await uploadToCloudinary(featuredImage);
                }

                // 2. Parse & clean HTML with cheerio
                const $ = cheerio.load(post.content.rendered);

                // Fix lazy-loaded images and upload ALL images to Cloudinary
                const imgPromises: Promise<void>[] = [];
                $('img').each((_, el) => {
                    const $img = $(el);
                    const originalSrc = $img.attr('data-src') || $img.attr('data-lazy-src') || $img.attr('data-original') || $img.attr('src');
                    
                    if (originalSrc) {
                        imgPromises.push((async () => {
                            const cloudinaryUrl = await uploadToCloudinary(originalSrc);
                            $img.attr('src', cloudinaryUrl);
                        })());
                    }

                    $img.removeAttr('loading');
                    $img.removeAttr('srcset');
                    $img.removeAttr('sizes');
                    $img.addClass('w-full h-auto rounded-lg my-4');
                });

                await Promise.all(imgPromises);

                // Clean attributes
                $('*').each((_, el) => {
                    const $el = $(el);
                    const classesToKeep = ['w-full', 'h-auto', 'rounded-lg', 'my-4'];
                    const keptClasses = ($el.attr('class') || '').split(/\s+/).filter(c => classesToKeep.includes(c));
                    $el.removeAttr('class');
                    if (keptClasses.length > 0) $el.addClass(keptClasses.join(' '));
                    $el.removeAttr('style');
                    $el.removeAttr('id');
                    const attrs = $el.attr();
                    if (attrs) {
                        Object.keys(attrs).forEach(attr => {
                            if (attr.startsWith('data-')) $el.removeAttr(attr);
                        });
                    }
                });

                // Remove empty containers
                $('div, span').each((_, el) => {
                    const $el = $(el);
                    if ($el.children().length === 0 && !$el.text().trim()) $el.remove();
                });

                const rawHtml = $('body').html() || '';

                // @ts-ignore
                const payload: any = {
                    title:    cheerio.load(post.title.rendered).root().text(),
                    slug:     post.slug,
                    content: {
                        time: new Date(post.date).getTime(),
                        blocks: [
                            {
                                type: 'paragraph',
                                data: { text: cheerio.load(post.excerpt.rendered.replace(/<[^>]*>?/gm, '')).root().text() }
                            },
                            {
                                type: 'html',
                                data: { html: rawHtml }
                            }
                        ]
                    },
                    featuredImage: featuredImage,
                    author:        authorName,
                    status:        'published',
                    publishedAt:   new Date(post.date),
                    seo: {
                        title:       post.yoast_head_json?.title       ? cheerio.load(post.yoast_head_json.title).root().text()       : cheerio.load(post.title.rendered).root().text(),
                        description: post.yoast_head_json?.description ? cheerio.load(post.yoast_head_json.description).root().text() : cheerio.load(post.excerpt.rendered.replace(/<[^>]*>?/gm, '')).root().text(),
                        keywords: []
                    }
                };

                try {
                    const existing = await blogService.findBySlug(payload.slug);
                    if (existing) {
                        await blogService.delete((existing as any)._id);
                        await blogService.create(payload);
                        totalMigrated++;
                        console.log('     ♻️  Replaced existing blog.');
                    } else {
                        await blogService.create(payload);
                        totalMigrated++;
                        console.log('     ✅ Created new blog.');
                    }
                } catch (err: any) {
                    console.error(`     ❌ Failed: ${err.message}`);
                }
            }

            page++;
        }

        console.log(`\n✅ FULL Migration complete. Total processed: ${totalMigrated}\n`);

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await app.close();
    }
}

bootstrap();
