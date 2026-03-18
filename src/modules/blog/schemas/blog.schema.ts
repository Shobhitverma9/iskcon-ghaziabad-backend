import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { Document } from "mongoose"

export type BlogPostDocument = BlogPost & Document

@Schema({ _id: false })
export class Seo {
    @Prop()
    title: string

    @Prop()
    description: string

    @Prop([String])
    keywords: string[]
}

@Schema({ timestamps: true, collection: "blog_posts" })
export class BlogPost {
    @Prop({ required: true })
    title: string

    @Prop({ required: true, unique: true, index: true })
    slug: string

    @Prop({ type: Object })
    content: any // Editor.js JSON output

    @Prop()
    featuredImage: string

    @Prop()
    author: string

    @Prop()
    category: string

    @Prop({ type: Seo })
    seo: Seo

    @Prop({ default: 'draft', enum: ['draft', 'published'] })
    status: string

    @Prop()
    publishedAt: Date

    @Prop({ default: 0 })
    views: number

    @Prop({ default: 0 })
    likes: number

    @Prop([String])
    tags: string[]
}

export const BlogPostSchema = SchemaFactory.createForClass(BlogPost)
