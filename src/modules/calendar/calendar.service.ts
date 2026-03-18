import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as ical from 'node-ical';
import { CalendarEvent, CalendarEventDocument } from './schemas/calendar-event.schema';
import { CreateCalendarEventDto } from './dto/create-event.dto';
import { StorageService } from '../../shared/storage/storage.service';
import sharp from 'sharp';

@Injectable()
export class CalendarService {
    private readonly logger = new Logger(CalendarService.name);

    constructor(
        @InjectModel(CalendarEvent.name)
        private calendarEventModel: Model<CalendarEventDocument>,
        private storageService: StorageService
    ) { }

    async processAndUploadImage(file: Express.Multer.File): Promise<string> {
        const filename = `calendar/${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`

        const buffer = await sharp(file.buffer)
            .resize(1080, null, {
                withoutEnlargement: true,
                fit: 'inside'
            })
            .toFormat('webp', { quality: 80 })
            .toBuffer()

        return this.storageService.uploadFile(buffer, filename, 'image/webp')
    }

    async parseAndSaveIcs(fileBuffer: Buffer): Promise<{ count: number }> {
        try {
            const parsedData = await ical.async.parseICS(fileBuffer.toString());
            let count = 0;

            for (const key in parsedData) {
                const event = parsedData[key];
                if (event.type === 'VEVENT') {
                    // Robust date handling
                    let eventDate = event.start;
                    // If date-only (no time), it might come as a property with 'date' type or similar 
                    // node-ical usually gives a Date object.

                    if (!eventDate) continue;

                    // Deduce type from summary/description
                    const type = this.determineType(event.summary, event.description);

                    // Structure extra data
                    const meta: Record<string, any> = {
                        originalStart: event.start,
                        originalEnd: event.end,
                        description: event.description,
                    };

                    // Regex for fasting and break fast times if present in description or summary
                    // Common patterns in Vaishnava calendars: "Fast: ...", "Break fast: ..."
                    if (event.description) {
                        // specific logic can be added here if we know the description format
                        // For now, we store the full description
                    }

                    const eventDto: CreateCalendarEventDto = {
                        date: eventDate.toISOString(),
                        title: event.summary,
                        description: event.description,
                        location: event.location,
                        type: type,
                        meta: meta,
                        uid: event.uid
                    };

                    await this.createOrUpdate(eventDto);
                    count++;
                }
            }
            this.logger.log(`Parsed and saved ${count} events.`);
            return { count };
        } catch (error) {
            this.logger.error('Error parsing ICS file', error);
            throw error;
        }
    }

    private determineType(summary: string, description: string): string {
        const text = (summary + ' ' + (description || '')).toLowerCase();
        if (text.includes('ekadasi')) return 'ekadasi';
        if (text.includes('purnima')) return 'purnima';
        if (text.includes('amavasya')) return 'amavasya';
        if (text.includes('festival') || text.includes('appearance') || text.includes('disappearance')) return 'festival';
        return 'general';
    }

    async createOrUpdate(createEventDto: CreateCalendarEventDto): Promise<CalendarEvent> {
        const { uid, date, ...rest } = createEventDto;

        // If UID exists, try to update by UID
        if (uid) {
            const existing = await this.calendarEventModel.findOne({ uid });
            if (existing) {
                Object.assign(existing, { date, ...rest });
                return existing.save();
            }
        }

        // Fallback: Check for same title and date to prevent duplicates if UID is missing/changed
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const match = await this.calendarEventModel.findOne({
            title: createEventDto.title,
            date: { $gte: startOfDay, $lte: endOfDay }
        });

        if (match) {
            Object.assign(match, rest); // Update details
            return match.save();
        }

        const newEvent = new this.calendarEventModel(createEventDto);
        return newEvent.save();
    }

    async findAll(month?: number, year?: number): Promise<CalendarEvent[]> {
        const query: any = {};

        if (month && year) {
            // Javascript months are 0-indexed for Date constructor but usually 1-indexed in API
            // Assuming API sends 1-12
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0); // Last day of the month
            endDate.setHours(23, 59, 59, 999);

            query.date = {
                $gte: startDate,
                $lte: endDate
            };
        } else if (year) {
            const startDate = new Date(year, 0, 1);
            const endDate = new Date(year, 11, 31);
            endDate.setHours(23, 59, 59, 999);
            query.date = {
                $gte: startDate,
                $lte: endDate
            };
        }

        return this.calendarEventModel.find(query).sort({ date: 1 }).exec();
    }

    async findUpcoming(limit: number = 3): Promise<CalendarEvent[]> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return this.calendarEventModel.find({
            date: { $gte: today }
        })
            .sort({ date: 1 })
            .limit(limit)
            .exec();
    }

    async create(createEventDto: CreateCalendarEventDto): Promise<CalendarEvent> {
        const newEvent = new this.calendarEventModel(createEventDto);
        return newEvent.save();
    }

    async update(id: string, updateEventDto: any): Promise<CalendarEvent> {
        return this.calendarEventModel.findByIdAndUpdate(id, updateEventDto, { new: true }).exec();
    }

    async remove(id: string): Promise<CalendarEvent> {
        return this.calendarEventModel.findByIdAndDelete(id).exec();
    }
}
