
const fetch = require('node-fetch');

async function check() {
    try {
        const res = await fetch('http://localhost:3001/api/songs');
        const songs = await res.json();
        console.log('--- SONGS DEBUG ---');
        console.log(`Found ${songs.length} songs.`);
        songs.forEach(s => {
            console.log(`Title: ${s.title}, ID: ${s._id}, Slug: ${s.slug}`);
        });
        console.log('-------------------');
    } catch (e) {
        console.error('Error fetching songs:', e);
    }
}

check();
