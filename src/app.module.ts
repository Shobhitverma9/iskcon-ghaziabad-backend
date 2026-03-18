import { Module } from "@nestjs/common"
import { ConfigModule, ConfigService } from "@nestjs/config"
import { CacheModule } from "@nestjs/cache-manager"
import { MongooseModule } from "@nestjs/mongoose"
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { APP_GUARD } from '@nestjs/core'
import { ScheduleModule } from '@nestjs/schedule'


import { DonationModule } from "./modules/donation/donation.module"
import { PoojaModule } from "./modules/pooja/pooja.module"
import { VolunteerModule } from "./modules/volunteer/volunteer.module"
import { DarshanModule } from "./modules/darshan/darshan.module"
import { BlogModule } from "./modules/blog/blog.module"
import { HealthModule } from "./modules/health/health.module"
import { AuthModule } from "./modules/auth/auth.module"
import { InstagramReelsModule } from "./modules/instagram-reels/instagram-reels.module"
import { CalendarModule } from "./modules/calendar/calendar.module"
import { SongsModule } from "./modules/songs/songs.module"
import { ExternalLinkModule } from "./modules/external-link/external-link.module"
import { InquiryModule } from "./modules/inquiry/inquiry.module"
import { StorageModule } from "./shared/storage/storage.module"
import { LandingPageModule } from "./modules/landing-page/landing-page.module"
import { SongCategoriesModule } from "./modules/song-categories/song-categories.module"
import { FestivalModule } from "./modules/festival/festival.module"
import { NotificationModule } from "./modules/notification/notification.module"
import { ContactSettingsModule } from "./modules/contact-settings/contact-settings.module"
import { PaymentModule } from "./modules/payment/payment.module"
import { AppController } from "./app.controller"
import { BannersModule } from "./modules/banners/banners.module"
import { ReceiptModule } from "./modules/receipt/receipt.module"
import { EmailBroadcastModule } from "./modules/email-broadcast/email-broadcast.module"

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI') || 'mongodb://127.0.0.1:27017/iskcon-ghaziabad',
      }),
      inject: [ConfigService],
    }),
    CacheModule.register({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    AuthModule,
    DonationModule,
    PoojaModule,
    VolunteerModule,
    DarshanModule,
    BlogModule,
    HealthModule,
    InstagramReelsModule,
    CalendarModule,
    SongsModule,
    ExternalLinkModule,
    InquiryModule,
    StorageModule,
    LandingPageModule,
    SongCategoriesModule,
    FestivalModule,
    NotificationModule,
    ContactSettingsModule,
    BannersModule,
    ReceiptModule,
    EmailBroadcastModule,
    PaymentModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  controllers: [AppController],
})
export class AppModule { }

