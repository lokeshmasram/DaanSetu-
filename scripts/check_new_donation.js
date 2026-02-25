const admin = require('firebase-admin');
const { getDistance } = require('geolib');
require('dotenv').config();

// Initialize Firebase Admin using environment variables
if (!admin.apps.length) {
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID
  });
}

const db = admin.firestore();

async function checkNewDonation() {
  try {
    console.log("\n🔍 Checking New Donation U8fbwYKG\n");
    console.log("=".repeat(60));

    const donationId = "U8fbwYKGuqiSW5XQ29oA";
    const ngoId = "user_1759478764183_pbwg1vhif";

    // Get donation data
    console.log("\n📦 DONATION DATA:");
    console.log("-".repeat(60));
    const donationDoc = await db.collection("donations").doc(donationId).get();
    
    if (!donationDoc.exists) {
      console.log("❌ Donation not found! Let me search for it...\n");
      
      // Find all pending donations
      const pendingDonations = await db.collection("donations")
        .where("status", "==", "pending")
        .get();
      
      if (pendingDonations.empty) {
        console.log("❌ No pending donations found!");
        process.exit(1);
      }
      
      // Get the most recent one manually
      let mostRecent = null;
      let mostRecentTime = null;
      
      pendingDonations.forEach(doc => {
        const data = doc.data();
        if (!mostRecentTime || (data.createdAt && data.createdAt > mostRecentTime)) {
          mostRecent = doc;
          mostRecentTime = data.createdAt;
        }
      });
      
      if (!mostRecent) {
        mostRecent = pendingDonations.docs[0];
      }
      
      console.log("✅ Found most recent pending donation:", mostRecent.id);
      const donationData = mostRecent.data();
      
      console.log("\nDonation Details:");
      console.log("  ID:", mostRecent.id);
      console.log("  Status:", donationData.status);
      console.log("  Pickup Address:", donationData.pickupAddress);
      console.log("  Has Coordinates:", !!donationData.coordinates);
      
      if (donationData.coordinates) {
        console.log("  Coordinates:", JSON.stringify(donationData.coordinates, null, 2));
        console.log("    Lat:", donationData.coordinates.lat);
        console.log("    Lng:", donationData.coordinates.lng);
      } else {
        console.log("  ❌ NO COORDINATES FIELD!");
      }
      
      console.log("  Matched NGO ID:", donationData.matchedNgoId || "none");
      console.log("  Created At:", donationData.createdAt?.toDate());
      
      // Get NGO data
      console.log("\n📋 NGO DATA:");
      console.log("-".repeat(60));
      const ngoDoc = await db.collection("users").doc(ngoId).get();
      const ngoData = ngoDoc.data();
      
      console.log("  NGO Name:", ngoData.name);
      console.log("  NGO Coordinates:", JSON.stringify(ngoData.coordinates, null, 2));
      
      // Calculate distance if both have coordinates
      if (donationData.coordinates && ngoData.coordinates) {
        const distance = getDistance(
          {
            latitude: ngoData.coordinates.lat,
            longitude: ngoData.coordinates.lng,
          },
          {
            latitude: donationData.coordinates.lat,
            longitude: donationData.coordinates.lng,
          }
        );
        
        console.log("\n📏 DISTANCE CALCULATION:");
        console.log("-".repeat(60));
        console.log("  Distance:", (distance / 1000).toFixed(2), "km");
        console.log("  Max allowed:", "15 km");
        
        if (distance <= 15000) {
          console.log("  ✅ Within range - NGO SHOULD see this donation");
        } else {
          console.log("  ❌ Out of range - NGO will NOT see this donation");
        }
      } else {
        console.log("\n❌ Cannot calculate distance - missing coordinates");
      }
      
      // Check backend query
      console.log("\n🔍 BACKEND QUERY SIMULATION:");
      console.log("-".repeat(60));
      const availableDonations = await db
        .collection("donations")
        .where("status", "in", ["pending", "available"])
        .get();
      
      console.log("  Total donations returned by query:", availableDonations.size);
      
      let matchCount = 0;
      availableDonations.forEach(doc => {
        const data = doc.data();
        if (data.coordinates && !data.matchedNgoId && ngoData.coordinates) {
          try {
            const dist = getDistance(
              { latitude: ngoData.coordinates.lat, longitude: ngoData.coordinates.lng },
              { latitude: data.coordinates.lat, longitude: data.coordinates.lng }
            );
            if (dist <= 15000) {
              matchCount++;
              console.log(`  ✅ ${doc.id}: ${(dist/1000).toFixed(2)} km away`);
            }
          } catch (e) {
            // Skip
          }
        }
      });
      
      console.log("\n  Total donations the NGO should see:", matchCount);
      
      if (matchCount === 0) {
        console.log("\n❌ PROBLEM IDENTIFIED:");
        console.log("  The NGO will see 0 donations because:");
        availableDonations.forEach(doc => {
          const data = doc.data();
          if (!data.coordinates) {
            console.log(`  - ${doc.id}: Missing coordinates`);
          } else if (data.matchedNgoId) {
            console.log(`  - ${doc.id}: Already matched`);
          } else if (ngoData.coordinates) {
            const dist = getDistance(
              { latitude: ngoData.coordinates.lat, longitude: ngoData.coordinates.lng },
              { latitude: data.coordinates.lat, longitude: data.coordinates.lng }
            );
            if (dist > 15000) {
              console.log(`  - ${doc.id}: Too far (${(dist/1000).toFixed(2)} km)`);
            }
          }
        });
      }
    }
    
    console.log("\n✅ Check complete\n");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

checkNewDonation();
