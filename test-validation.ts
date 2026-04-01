import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { LandingPageService } from './src/modules/landing-page/landing-page.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const service = app.get(LandingPageService);

    console.log('Testing pooja_offerings validation...');
    try {
        const testSlug = 'test-slug-' + Date.now();
        const result = await service.create({
            title: 'Test Page',
            slug: testSlug,
            isActive: false,
            hero: {
                backgroundImage: 'test.jpg',
                buttonText: 'Donate'
            },
            sections: [
                {
                    type: 'pooja_offerings',
                    content: { test: true }
                }
            ]
        } as any);
        console.log('Success! Created page with pooja_offerings:', result.slug);
    } catch (error) {
        console.error('Validation FAILED:', error.message);
    } finally {
        await app.close();
    }
}

bootstrap();
