import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { CalendarEvent, CalendarEventSchema } from './schemas/calendar-event.schema';
import { StorageModule } from '../../shared/storage/storage.module';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: CalendarEvent.name, schema: CalendarEventSchema }]),
        StorageModule,
    ],
    controllers: [CalendarController],
    providers: [CalendarService],
    exports: [CalendarService],
})
export class CalendarModule { }
