import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

async function testPdf() {
    console.log('🧪 Testing wkhtmltopdf...');

    const wkhtmltopdfPath = '"C:\\Program Files\\wkhtmltopdf\\bin\\wkhtmltopdf.exe"';
    const htmlPath = path.join(__dirname, 'test.html');
    const pdfPath = path.join(__dirname, 'test.pdf');

    fs.writeFileSync(htmlPath, '<h1>Hello World</h1>');

    try {
        const command = `${wkhtmltopdfPath} "${htmlPath}" "${pdfPath}"`;
        console.log(`Executing: ${command}`);
        const { stdout, stderr } = await execAsync(command);
        console.log('STDOUT:', stdout);
        console.log('STDERR:', stderr);

        if (fs.existsSync(pdfPath)) {
            console.log('✅ PDF generated successfully!');
            const stats = fs.statSync(pdfPath);
            console.log(`Size: ${stats.size} bytes`);
        } else {
            console.error('❌ PDF file not created');
        }
    } catch (error) {
        console.error('❌ Error executing wkhtmltopdf:', error.message);
    } finally {
        if (fs.existsSync(htmlPath)) fs.unlinkSync(htmlPath);
        if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
    }
}

testPdf();
