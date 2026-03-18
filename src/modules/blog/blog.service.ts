import { Injectable, Inject, ConflictException } from "@nestjs/common"
import { InjectModel } from "@nestjs/mongoose"
import { CACHE_MANAGER } from "@nestjs/cache-manager"
import { Model } from "mongoose"
import type { Cache } from "cache-manager"
import { BlogPost, BlogPostDocument } from "./schemas/blog.schema"


import { StorageService } from "../../shared/storage/storage.service"
import sharp from "sharp"

@Injectable()
export class BlogService {
  constructor(
    @InjectModel(BlogPost.name) private blogModel: Model<BlogPostDocument>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private storageService: StorageService
  ) { }

  async create(createBlogDto: any): Promise<BlogPost> {
    // Generate slug if not provided
    if (!createBlogDto.slug) {
      createBlogDto.slug = createBlogDto.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
    }

    if (createBlogDto.status === 'published' && !createBlogDto.publishedAt) {
      createBlogDto.publishedAt = new Date();
    }

    const createdBlog = new this.blogModel(createBlogDto);
    try {
      const savedBlog = await createdBlog.save();

      // Invalidate all-blogs cache
      await this.cacheManager.del('blog:all:v3:10:0:all');
      await this.cacheManager.del('blog:all:v3:100:0:all');
      return savedBlog;
    } catch (error: any) {
      if (error.code === 11000) {
        throw new ConflictException('A blog with this slug already exists. Please use a unique title or slug.');
      }
      throw error;
    }
  }

  async update(id: string, updateBlogDto: any): Promise<BlogPost | null> {
    if (updateBlogDto.status === 'published' && !updateBlogDto.publishedAt) {
      // Check if it was already published (optional, but good for consistency)
      // For now, simplify: if sending status=published and no date, set it.
      updateBlogDto.publishedAt = new Date();
    }

    const updatedBlog = await this.blogModel
      .findByIdAndUpdate(id, updateBlogDto, { new: true })
      .exec();

    if (updatedBlog) {
      // Invalidate specific caches
      await this.cacheManager.del(`blog:${id}`);
      await this.cacheManager.del(`blog:slug:${updatedBlog.slug}`);
      // Invalidate lists (simplistic approach)
      await this.cacheManager.reset();
    }

    return updatedBlog;
  }

  async delete(id: string): Promise<void> {
    await this.blogModel.findByIdAndDelete(id).exec();
    await this.cacheManager.del(`blog:${id}`);
    await this.cacheManager.reset();
  }

  async findById(id: string): Promise<BlogPost | null> {
    const cacheKey = `blog:${id}`
    const cached = await this.cacheManager.get<BlogPost>(cacheKey)

    if (cached) {
      return cached
    }

    const post = await this.blogModel.findById(id).exec()

    if (post) {
      await this.cacheManager.set(cacheKey, post, 3600000)
    }

    return post
  }

  async findBySlug(slug: string): Promise<BlogPost | null> {
    const cacheKey = `blog:slug:${slug}`
    const cached = await this.cacheManager.get<BlogPost>(cacheKey)

    if (cached) {
      return cached
    }

    const post = await this.blogModel.findOne({ slug, status: 'published' }).exec()

    if (post) {
      await this.cacheManager.set(cacheKey, post, 3600000)
    }

    return post
  }

  async getAll(limit = 10, offset = 0, status?: string, category?: string): Promise<{ blogs: BlogPost[], total: number }> {
    const cacheKey = `blog:all:v3:${limit}:${offset}:${status || 'all'}:${category || 'all'}`
    const cached = await this.cacheManager.get<{ blogs: BlogPost[], total: number }>(cacheKey)

    if (cached) {
      return cached
    }

    const query: any = {};
    if (status) {
      query.status = status;
    }
    if (category && category !== 'All') {
      query.category = category;
    }

    const [blogs, total] = await Promise.all([
      this.blogModel
        .find(query)
        .sort({ publishedAt: -1 })
        .skip(offset)
        .limit(limit)
        .exec(),
      this.blogModel.countDocuments(query).exec()
    ]);

    const result = { blogs, total };
    await this.cacheManager.set(cacheKey, result, 1800000)

    return result
  }

  async incrementViews(id: string): Promise<void> {
    await this.blogModel.findByIdAndUpdate(id, { $inc: { views: 1 } }).exec()
    await this.cacheManager.del(`blog:${id}`)
  }

  async likePost(slug: string): Promise<number> {
    const post = await this.blogModel.findOneAndUpdate(
      { slug },
      { $inc: { likes: 1 } },
      { new: true }
    ).exec();
    if (post) {
      await this.cacheManager.del(`blog:slug:${slug}`);
      return post.likes;
    }
    return 0;
  }

  async getAdjacentPosts(publishedAt: Date): Promise<{ previous: BlogPost | null, next: BlogPost | null }> {
    const [previous, next] = await Promise.all([
      this.blogModel.findOne({ publishedAt: { $lt: publishedAt }, status: 'published' })
        .sort({ publishedAt: -1 })
        .select('title slug')
        .exec(),
      this.blogModel.findOne({ publishedAt: { $gt: publishedAt }, status: 'published' })
        .sort({ publishedAt: 1 })
        .select('title slug')
        .exec()
    ]);
    return { previous, next };
  }

  async processAndUploadImage(file: Express.Multer.File): Promise<string> {
    const filename = `blogs/${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`

    const buffer = await sharp(file.buffer)
      .resize(1920, null, { // slightly larger for blog featured images
        withoutEnlargement: true,
        fit: 'inside'
      })
      .toFormat('webp', { quality: 80 })
      .toBuffer()

    return this.storageService.uploadFile(buffer, filename, 'image/webp')
  }
}
