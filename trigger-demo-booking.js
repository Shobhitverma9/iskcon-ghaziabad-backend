const axios = require('axios');

async function triggerDemoBooking() {
  const url = 'http://localhost:3001/api/pooja/bookings';
  const payload = {
    devoteeName: "Demo User (Test Notification)",
    devoteEmail: "demo@example.com",
    devotePhone: "9876543210",
    poojaType: "Tulsi Offering (Test)",
    poojaDate: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
    amount: 101,
    items: [],
    status: "pending"
  };

  try {
    console.log('--- Sending Demo Pooja Booking Request ---');
    console.log('URL:', url);
    console.log('Payload:', JSON.stringify(payload, null, 2));

    const response = await axios.post(url, payload);

    console.log('\n--- Success Response ---');
    console.log('Status Code:', response.status);
    console.log('Response Data:', JSON.stringify(response.data, null, 2));
    console.log('\n✅ Demo booking triggered successfully. Check server logs for WhatsApp notification trigger.');
  } catch (error) {
    console.error('\n--- Error ---');
    if (error.response) {
      console.error('Status Code:', error.response.status);
      console.error('Error Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Message:', error.message);
    }
    console.error('\n❌ Failed to trigger demo booking. Make sure backend is running on http://localhost:3001/api');
  }
}

triggerDemoBooking();
