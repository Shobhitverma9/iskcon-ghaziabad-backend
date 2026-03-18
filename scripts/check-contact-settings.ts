
import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { ContactSettingsSchema } from '../src/modules/contact-settings/schemas/contact-settings.schema';

dotenv.config();

async function check() {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/iskcon-ghaziabad');
    console.log('Connected.');

    const ContactSettingsModel = mongoose.model('ContactSettings', ContactSettingsSchema);

    const settings = await ContactSettingsModel.find({});
    console.log('Contact Settings Documents:', JSON.stringify(settings, null, 2));

    await mongoose.disconnect();
}

check().catch(err => console.error(err));
