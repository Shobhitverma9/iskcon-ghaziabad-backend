import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
} from "@nestjs/common"
import { LandingPageService } from "./landing-page.service"
import { CreateLandingPageDto } from "./dto/create-landing-page.dto"
import { UpdateLandingPageDto } from "./dto/update-landing-page.dto"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"

@Controller("landing-pages")
export class LandingPageController {
    constructor(private readonly landingPageService: LandingPageService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    create(@Body() createLandingPageDto: CreateLandingPageDto) {
        return this.landingPageService.create(createLandingPageDto)
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    findAll() {
        return this.landingPageService.findAll()
    }

    @Get("public/:slug")
    findBySlug(@Param("slug") slug: string) {
        if (slug === 'favicon.ico' || slug.endsWith('.png') || slug.endsWith('.jpg') || slug.endsWith('.jpeg')) {
            throw new NotFoundException(`Static asset ${slug} not found as a landing page`)
        }
        return this.landingPageService.findBySlug(slug)
    }

    @Get(":id")
    @UseGuards(JwtAuthGuard)
    findOne(@Param("id") id: string) {
        return this.landingPageService.findOne(id)
    }

    @Patch(":id")
    @UseGuards(JwtAuthGuard)
    update(
        @Param("id") id: string,
        @Body() updateLandingPageDto: UpdateLandingPageDto
    ) {
        return this.landingPageService.update(id, updateLandingPageDto)
    }

    @Delete(":id")
    @UseGuards(JwtAuthGuard)
    remove(@Param("id") id: string) {
        return this.landingPageService.remove(id)
    }
}
