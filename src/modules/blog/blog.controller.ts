import { Controller, Get, Param, Post, Query, Body, Put, Delete, UseGuards, UseInterceptors, UploadedFile, HttpException, HttpStatus, Logger } from "@nestjs/common"
import { FileInterceptor } from "@nestjs/platform-express"
import { BlogService } from "./blog.service"
import { CreateBlogDto } from "./dto/create-blog.dto"
import { UpdateBlogDto } from "./dto/update-blog.dto"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { RolesGuard } from "../auth/guards/roles.guard"
import { Roles } from "../auth/decorators/roles.decorator"

@Controller("blog")
export class BlogController {
  private readonly logger = new Logger(BlogController.name);

  constructor(private readonly blogService: BlogService) { }

  @Get()
  async getAll(
    @Query('limit') limit = 10,
    @Query('offset') offset = 0,
    @Query('status') status?: string,
    @Query('category') category?: string
  ) {
    return this.blogService.getAll(limit, offset, status, category)
  }

  @Get("slug/:slug")
  async getBySlug(@Param('slug') slug: string) {
    return this.blogService.findBySlug(slug)
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.blogService.findById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'seo')
  @Post()
  async create(@Body() createBlogDto: CreateBlogDto) {
    return this.blogService.create(createBlogDto);
  }

  @Post('upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'seo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    try {
      if (!file) {
        throw new Error('No file provided');
      }
      const url = await this.blogService.processAndUploadImage(file);
      return { url };
    } catch (error: any) {
      this.logger.error('Image Upload Error:', error);
      throw new HttpException(error.message || 'Image upload failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'seo')
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateBlogDto: UpdateBlogDto) {
    return this.blogService.update(id, updateBlogDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'seo')
  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.blogService.delete(id);
    return { success: true };
  }

  @Post(':id/view')
  async incrementView(@Param('id') id: string) {
    await this.blogService.incrementViews(id);
    return { success: true };
  }
  @Get("slug/:slug/adjacent")
  async getAdjacentBySlug(@Param('slug') slug: string) {
    const post = await this.blogService.findBySlug(slug);
    if (!post) return { previous: null, next: null };
    return this.blogService.getAdjacentPosts(post.publishedAt || (post as any).createdAt);
  }

  @Post('slug/:slug/like')
  async likePost(@Param('slug') slug: string) {
    const likes = await this.blogService.likePost(slug);
    return { likes };
  }
}
