const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// New Cloudinary Credentials
const NEW_CONFIG = {
    cloud_name: 'ddcfe7ux2',
    api_key: '886133274712621',
    api_secret: 'UL0NOTNB5vLKTP83iJuFYGaZaNw'
};

cloudinary.config(NEW_CONFIG);

const assetsPath = path.join(__dirname, 'cloudinary-assets.json');
const mappingPath = path.join(__dirname, 'url-mapping.json');

if (!fs.existsSync(assetsPath)) {
    console.error('cloudinary-assets.json not found.');
    process.exit(1);
}

const oldUrls = JSON.parse(fs.readFileSync(assetsPath, 'utf8'));
const urlMapping = {};

async function migrate() {
    console.log(`Starting migration of ${oldUrls.length} assets...`);

    for (const oldUrl of oldUrls) {
        try {
            console.log(`Migrating: ${oldUrl}`);

            // Extract folder and public ID from URL
            const urlParts = oldUrl.split('/upload/');
            if (urlParts.length < 2) {
                console.warn(`Could not parse URL: ${oldUrl}`);
                continue;
            }

            const pathWithVersion = urlParts[1];
            const pathParts = pathWithVersion.split('/');
            if (pathParts[0].startsWith('v') && !isNaN(pathParts[0].substring(1))) {
                pathParts.shift();
            }

            const fullPath = pathParts.join('/');
            const extension = path.extname(fullPath);
            const publicIdWithFolder = fullPath.replace(extension, '');

            const resourceType = extension.toLowerCase() === '.pdf' ? 'raw' : 'image';

            console.log(`Uploading to new account with Public ID: ${publicIdWithFolder} (${resourceType})`);

            const result = await cloudinary.uploader.upload(oldUrl, {
                public_id: publicIdWithFolder,
                overwrite: true,
                resource_type: resourceType,
                invalidate: true
            });

            console.log(`Successfully migrated to: ${result.secure_url}`);
            urlMapping[oldUrl] = result.secure_url;

        } catch (err) {
            console.error(`Failed to migrate ${oldUrl}:`, err.message);
        }
    }

    fs.writeFileSync(mappingPath, JSON.stringify(urlMapping, null, 2));
    console.log(`\nMigration complete! Mapping saved to url-mapping.json`);
    console.log(`Successfully migrated ${Object.keys(urlMapping).length} of ${oldUrls.length} assets.`);
}

migrate();
