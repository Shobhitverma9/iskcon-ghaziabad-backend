const mongoose = require('mongoose');

const uri = 'mongodb+srv://shobhit:shobhit@cluster0.ayg15an.mongodb.net/iskcon-ghaziabad?retryWrites=true&w=majority&authSource=admin';

async function run() {
    await mongoose.connect(uri);
    const Donation = mongoose.model('Donation', new mongoose.Schema({ status: String }, { strict: false }));

    const donation = await Donation.findOne({ status: 'completed' }).sort({ _id: -1 });

    if (donation) {
        console.log('RESULT_ID:' + donation._id.toString());
    } else {
        console.log('RESULT:NONE');
    }

    await mongoose.disconnect();
}

run().catch(console.error);
