const fs = require('fs');

async function testItemCreation() {
    console.log("Testing Donation Item Creation with isActive...");
    
    // Step 1: Login to get session_token cookie
    console.log("Logging in...");
    const loginRes = await fetch('http://127.0.0.1:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin2@iskcon.org', password: 'Admin@123' }),
        credentials: 'include'
    });
    
    const loginData = await loginRes.json();
    if (loginRes.status !== 200) {
        console.error("Login failed!", loginData);
        return;
    }
    
    const setCookie = loginRes.headers.get('set-cookie');
    const tokenMatch = setCookie?.match(/session_token=([^;]+)/);
    if (!tokenMatch) {
        console.error("No session_token found");
        return;
    }
    const sessionToken = tokenMatch[1];

    // Step 2: Get a category ID
    const catRes = await fetch('http://127.0.0.1:3001/api/donations/categories', {
        headers: { 'Cookie': `session_token=${sessionToken}` }
    });
    const categories = await catRes.json();
    if (!categories.length) {
        console.error("No categories found to link item to");
        return;
    }
    const categoryId = categories[0]._id;

    // Step 3: Try to create an item with isActive
    console.log("Creating item...");
    const itemPayload = {
        category: categoryId,
        title: "Test Item " + Date.now(),
        description: "Test Description",
        defaultAmount: 501,
        isCustomAmount: true,
        isActive: true
    };

    const res = await fetch('http://127.0.0.1:3001/api/donations/items', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Cookie': `session_token=${sessionToken}`
        },
        body: JSON.stringify(itemPayload)
    });

    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Response:", JSON.stringify(data, null, 2));

    if (res.status === 201) {
        console.log("SUCCESS: Item created with isActive!");
    } else {
        console.error("FAILURE: Could not create item.");
    }
}

testItemCreation().catch(console.error);
