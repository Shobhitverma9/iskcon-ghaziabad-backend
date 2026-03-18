
import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { CalendarEventSchema } from '../src/modules/calendar/schemas/calendar-event.schema';

dotenv.config();

async function check() {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/iskcon-ghaziabad');
    console.log('Connected.');

    const CalendarEventModel = mongoose.model('CalendarEvent', CalendarEventSchema);

    // Check total count
    const count = await CalendarEventModel.countDocuments();
    console.log(`Total events in DB: ${count}`);

    // Check for Jan 2026
    const start = new Date('2026-01-01T00:00:00.000Z');
    const end = new Date('2026-01-31T23:59:59.999Z');

    const janEvents = await CalendarEventModel.find({
        date: { $gte: start, $lte: end }
    });

    console.log(`Events in Jan 2026: ${janEvents.length}`);
    if (janEvents.length > 0) {
        console.log('Sample date:', janEvents[0].date);
    }

    await mongoose.disconnect();
}

check().catch(err => console.error(err));
