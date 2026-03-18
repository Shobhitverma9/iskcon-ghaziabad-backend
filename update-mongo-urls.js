const { MongoClient } = require("mongodb");
const fs = require('fs');
const path = require('path');

// Function to parse .env file
function getMongoUri() {
    try {
        const envPath = path.join(__dirname, '.env');
        if (!fs.existsSync(envPath)) return null;
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/^MONGODB_URI=(.+)$/m);
        return match ? match[1].trim() : null;
    } catch (err) {
        return null;
    }
}

const uri = getMongoUri();
const mappingPath = path.join(__dirname, 'url-mapping.json');

if (!uri) {
    console.error("MONGODB_URI not found.");
    process.exit(1);
}

if (!fs.existsSync(mappingPath)) {
    console.error("url-mapping.json not found.");
    process.exit(1);
}

const urlMapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
const oldUrls = Object.keys(urlMapping);

// Extract database name from URI
let dbName = "iskcon-ghaziabad";
try {
    const parts = uri.split('/');
    const dbPart = parts[parts.length - 1];
    if (dbPart) {
        dbName = dbPart.split('?')[0];
    }
} catch (err) { }

function replaceUrlsRecursive(obj, mapping, stats) {
    if (!obj || typeof obj !== 'object') return obj;

    let modified = false;

    for (const key in obj) {
        const value = obj[key];
        if (typeof value === 'string') {
            let newVal = value;
            let replacedInString = false;

            // Check for exact matches and partial matches (e.g. inside Editor.js JSON)
            for (const oldUrl in mapping) {
                if (newVal.includes(oldUrl)) {
                    newVal = newVal.split(oldUrl).join(mapping[oldUrl]);
                    replacedInString = true;
                    stats.count++;
                }
            }

            if (replacedInString) {
                obj[key] = newVal;
                modified = true;
            }
        } else if (Array.isArray(value)) {
            value.forEach((item, index) => {
                if (typeof item === 'object') {
                    if (replaceUrlsRecursive(item, mapping, stats)) modified = true;
                } else if (typeof item === 'string') {
                    for (const oldUrl in mapping) {
                        if (item.includes(oldUrl)) {
                            value[index] = item.split(oldUrl).join(mapping[oldUrl]);
                            modified = true;
                            stats.count++;
                        }
                    }
                }
            });
        } else if (typeof value === 'object') {
            if (replaceUrlsRecursive(value, mapping, stats)) modified = true;
        }
    }
    return modified;
}

async function updateDb() {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        console.log("Connected to MongoDB");
        const db = client.db(dbName);

        const collections = await db.listCollections().toArray();
        let totalUpdates = 0;

        for (const colInfo of collections) {
            const collectionName = colInfo.name;
            if (collectionName.startsWith('system.')) continue;

            console.log(`Processing collection: ${collectionName}`);
            const cursor = db.collection(collectionName).find({});

            while (await cursor.hasNext()) {
                const doc = await cursor.next();
                const stats = { count: 0 };
                const originalId = doc._id;

                if (replaceUrlsRecursive(doc, urlMapping, stats)) {
                    console.log(`  Updating document ${originalId} in ${collectionName} (${stats.count} URLs)`);
                    await db.collection(collectionName).replaceOne({ _id: originalId }, doc);
                    totalUpdates++;
                }
            }
        }

        console.log(`\nSuccess! Updated ${totalUpdates} documents in total.`);

    } catch (err) {
        console.error("Error during update:", err);
    } finally {
        await client.close();
    }
}

updateDb();
