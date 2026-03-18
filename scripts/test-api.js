
const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/calendar?month=1&year=2026',
    method: 'GET',
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const events = JSON.parse(data);
            console.log(`Events found: ${events.length}`);
            if (events.length > 0) {
                console.log('Sample Event:', JSON.stringify(events[0], null, 2));
            }
        } catch (e) {
            console.log('Response body:', data);
        }
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.end();
