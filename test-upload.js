async function run() {
    // Step 1: Login to get session_token cookie
    console.log("Logging in...");
    const loginRes = await fetch('http://127.0.0.1:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin2@iskcon.org', password: 'Admin@123' }),
        credentials: 'include'
    });
    
    const loginData = await loginRes.json();
    console.log("Login status:", loginRes.status);
    console.log("Login response:", JSON.stringify(loginData).slice(0, 200));
    
    // Extract the session_token from Set-Cookie header
    const setCookie = loginRes.headers.get('set-cookie');
    console.log("Set-Cookie:", setCookie);
    
    const tokenMatch = setCookie?.match(/session_token=([^;]+)/);
    if (!tokenMatch) {
        console.error("No session_token found in cookies");
        return;
    }
    
    const sessionToken = tokenMatch[1];
    console.log("Got session token:", sessionToken.slice(0, 30) + "...");
    
    // Step 2: Upload file with the cookie
    const buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
    const fileBlob = new Blob([buffer], { type: 'image/png' });
    const formData = new FormData();
    formData.append('file', fileBlob, 'test.png');
    
    console.log("\nUploading with auth cookie...");
    const uploadRes = await fetch('http://127.0.0.1:3001/api/donations/upload', {
        method: 'POST',
        body: formData,
        headers: {
            'Cookie': `session_token=${sessionToken}`
        }
    });
    
    const uploadText = await uploadRes.text();
    console.log("Upload status:", uploadRes.status);
    console.log("Upload response:", uploadText);
}
run().catch(console.error);
