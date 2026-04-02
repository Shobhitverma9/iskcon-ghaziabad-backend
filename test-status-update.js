const axios = require('axios');

async function testStatusUpdate() {
  const bookingId = "69ce3fea2bc831f233d65814"; // From previous success response
  const url = `http://localhost:3001/api/pooja/bookings/${bookingId}/status`;
  
  const payload = {
    status: "pending",
    metadata: {
      pendingReason: "Waiting for flower availability (Test Verification)"
    }
  };

  try {
    console.log('--- Sending Status Update Request ---');
    console.log('URL:', url);
    console.log('Payload:', JSON.stringify(payload, null, 2));

    const axiosResponse = await axios.patch(url, payload);

    console.log('\n--- Success Response ---');
    console.log('Status Code:', axiosResponse.status);
    console.log('Response Data:', JSON.stringify(axiosResponse.data, null, 2));
    
    if (axiosResponse.data.pendingReason === payload.metadata.pendingReason) {
      console.log('\n✅ Pending Reason updated successfully in the database.');
    } else {
      console.log('\n❌ Pending Reason mismatch in response.');
    }
  } catch (error) {
    console.error('\n--- Error ---');
    if (error.response) {
      console.error('Status Code:', error.response.status);
      console.error('Error Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Message:', error.message);
    }
  }
}

testStatusUpdate();
