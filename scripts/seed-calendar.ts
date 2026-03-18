
import * as mongoose from 'mongoose';
import * as ical from 'node-ical';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { CalendarEventSchema } from '../src/modules/calendar/schemas/calendar-event.schema';

dotenv.config();

async function seed() {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/iskcon-ghaziabad');
    console.log('Connected.');

    const CalendarEventModel = mongoose.model('CalendarEvent', CalendarEventSchema);

    const icsPath = path.join(__dirname, '../../public/Delhi [India]-a2026-ICS.ics');
    console.log(`Reading ICS file from: ${icsPath}`);

    if (!fs.existsSync(icsPath)) {
        console.error('ICS file not found!');
        process.exit(1);
    }

    const fileContent = fs.readFileSync(icsPath, 'utf-8');
    const parsedData = await ical.async.parseICS(fileContent);

    let count = 0;
    console.log('Parsing events...');

    for (const key in parsedData) {
        const event = parsedData[key];
        if (event.type === 'VEVENT') {
            const eventDate = event.start;
            if (!eventDate) continue;

            const summary = event.summary || '';
            const description = event.description || '';

            // Determine type
            let type = 'general';
            const text = (summary + ' ' + description).toLowerCase();
            if (text.includes('ekadasi')) type = 'ekadasi';
            else if (text.includes('purnima')) type = 'purnima';
            else if (text.includes('amavasya')) type = 'amavasya';
            else if (text.includes('festival') || text.includes('appearance') || text.includes('disappearance')) type = 'festival';

            const meta = {
                originalStart: event.start,
                originalEnd: event.end,
                description: description,
            };

            // Upsert
            const startOfDay = new Date(eventDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(eventDate);
            endOfDay.setHours(23, 59, 59, 999);

            // Try to find by UID first, then by title+date
            let match = null;
            if (event.uid) {
                match = await CalendarEventModel.findOne({ uid: event.uid });
            }

            if (!match) {
                match = await CalendarEventModel.findOne({
                    title: summary,
                    date: { $gte: startOfDay, $lte: endOfDay }
                });
            }

            const eventData = {
                date: eventDate,
                title: summary,
                description: description,
                location: event.location,
                type: type,
                meta: meta,
                uid: event.uid
            };

            if (match) {
                Object.assign(match, eventData);
                await match.save();
            } else {
                await CalendarEventModel.create(eventData);
            }
            count++;
        }
    }

    console.log(`Successfully seeded ${count} events.`);
    await mongoose.disconnect();
}

seed().catch(err => {
    console.error(err);
    process.exit(1);
});
