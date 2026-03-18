const fs = require('fs');
const path = require('path');
const https = require('https');
const os = require('os');

const binDir = path.join(__dirname, '../bin');
const fileName = os.platform() === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
const binPath = path.join(binDir, fileName);

if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
}

// Check if it exists and is executable to save time locally
if (fs.existsSync(binPath)) {
    console.log(`${fileName} already exists. Skipping download.`);
    process.exit(0);
}

const url = os.platform() === 'win32'
    ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
    : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';

console.log(`Downloading ${fileName} from ${url} directly to bypass API limits...`);

https.get(url, (res) => {
    // Handle redirect since GitHub uses 302s for releases
    if (res.statusCode === 301 || res.statusCode === 302) {
        https.get(res.headers.location, (redirectRes) => {
            saveFile(redirectRes);
        }).on('error', handleError);
    } else {
        saveFile(res);
    }
}).on('error', handleError);

function saveFile(response) {
    if (response.statusCode >= 400) {
        handleError(new Error(`Failed with status code: ${response.statusCode}`));
        return;
    }
    const file = fs.createWriteStream(binPath);
    response.pipe(file);
    file.on('finish', () => {
        file.close();
        if (os.platform() !== 'win32') {
            fs.chmodSync(binPath, '755'); // Make executable on linux/mac
        }
        console.log(`Download complete! Saved to ${binPath}`);
    });
}

function handleError(err) {
    console.error('Download failed:', err.message);
    process.exit(1);
}
