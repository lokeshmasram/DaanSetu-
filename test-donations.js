const axios = require("axios");

// Test the donations endpoints
async function testDonationsEndpoints() {
  try {
    console.log("Testing donations endpoints...");

    // Test history endpoint
    console.log("Testing /api/donations/history...");
    const historyResponse = await axios.get(
      "http://localhost:3000/api/donations/history"
    );
    console.log("History response:", historyResponse.data);

    // Test list endpoint
    console.log("Testing /api/donations/list...");
    const listResponse = await axios.get(
      "http://localhost:3000/api/donations/list"
    );
    console.log("List response:", listResponse.data);
  } catch (error) {
    console.error(
      "Error testing endpoints:",
      error.response ? error.response.data : error.message
    );
  }
}

testDonationsEndpoints();
