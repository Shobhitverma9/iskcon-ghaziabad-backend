import mongoose from "mongoose"
import * as dotenv from "dotenv"
import * as path from "path"

// Load env
dotenv.config({ path: path.resolve(__dirname, "../.env") })

async function updatePhones() {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/iskcon-ghaziabad'
    console.log("Connecting to", uri)
    
    await mongoose.connect(uri)
    console.log("Connected to MongoDB")

    // The collection name usually pluralized from model name, contactsettings or contactsettings (NestJS defaults)
    // Actually, let's just use the schema or collection directly. NestJS schema name: "ContactSettings"
    const db = mongoose.connection.db
    if (!db) {
        throw new Error("No db connection")
    }
    const collectionName = "contactsettings" // NestJS/Mongoose usually lowercase and pluralizes or keeps it same if specified. Let's try both.
    let collections = await db.listCollections().toArray()
    let name = collections.find(c => c.name.toLowerCase().includes("contactsetting"))?.name

    if (name) {
        console.log("Found collection:", name)
        const result = await db.collection(name).updateMany(
            {},
            {
                $set: {
                    phone1: "+91 85889 10062",
                    phone2: "+91 92176 40062"
                }
            }
        )
        console.log(`Modified ${result.modifiedCount} documents.`)
    } else {
        console.log("No contact settings collection found. The schema default will be used on next creation.")
    }

    await mongoose.disconnect()
    console.log("Disconnected from MongoDB")
}

updatePhones().catch(console.error)
