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

async function diagnoseAvailableDonations() {
  try {
    console.log("\n🔍 COMPREHENSIVE DONATION VISIBILITY DIAGNOSTIC\n");
    console.log("=" .repeat(60));

    const ngoId = "user_1759478764183_pbwg1vhif"; // Lokesh Masram
    const maxDistance = 15000; // 15km

    // 1. Get NGO data
    console.log("\n📋 STEP 1: Fetching NGO Data");
    console.log("-".repeat(60));
    const ngoDoc = await db.collection("users").doc(ngoId).get();
    const ngoData = ngoDoc.data();
    
    console.log(`NGO ID: ${ngoId}`);
    console.log(`NGO Name: ${ngoData.name}`);
    console.log(`NGO Status: ${ngoData.status}`);
    console.log(`Has Coordinates: ${!!ngoData.coordinates}`);
    
    if (ngoData.coordinates) {
      console.log(`NGO Location: ${ngoData.coordinates.lat}, ${ngoData.coordinates.lng}`);
    } else {
      console.log("❌ NGO has no coordinates - will return empty list");
      return;
    }

    // 2. Get all donations
    console.log("\n📋 STEP 2: Fetching All Donations");
    console.log("-".repeat(60));
    const allDonationsSnapshot = await db.collection("donations").get();
    console.log(`Total donations in database: ${allDonationsSnapshot.size}`);

    // 3. Filter by status (pending or available)
    console.log("\n📋 STEP 3: Filtering by Status");
    console.log("-".repeat(60));
    const donationsSnapshot = await db
      .collection("donations")
      .where("status", "in", ["pending", "available"])
      .get();
    console.log(`Donations with status 'pending' or 'available': ${donationsSnapshot.size}`);

    if (donationsSnapshot.empty) {
      console.log("\n❌ NO DONATIONS with 'pending' or 'available' status found!");
      console.log("\nLet's check all donation statuses:");
      allDonationsSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`  - ${doc.id}: status='${data.status}', hasCoordinates=${!!data.coordinates}`);
      });
      return;
    }

    // 4. Check each donation
    console.log("\n📋 STEP 4: Checking Each Donation");
    console.log("-".repeat(60));

    let processedCount = 0;
    let eligibleCount = 0;
    const eligibleDonations = [];

    donationsSnapshot.forEach((doc) => {
      processedCount++;
      const donationData = doc.data();
      
      console.log(`\n🔸 Donation ${processedCount}: ${doc.id}`);
      console.log(`   Status: ${donationData.status}`);
      console.log(`   Has Coordinates: ${!!donationData.coordinates}`);
      console.log(`   Matched NGO ID: ${donationData.matchedNgoId || 'none'}`);
      
      if (donationData.coordinates) {
        console.log(`   Location: ${donationData.coordinates.lat}, ${donationData.coordinates.lng}`);
      }

      // Check eligibility
      if (!donationData.coordinates) {
        console.log(`   ❌ REJECTED: No coordinates`);
        return;
      }

      if (donationData.matchedNgoId) {
        console.log(`   ❌ REJECTED: Already matched to NGO ${donationData.matchedNgoId}`);
        return;
      }

      // Calculate distance
      try {
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

        const distanceKm = (distance / 1000).toFixed(2);
        console.log(`   📏 Distance: ${distanceKm} km`);

        if (distance <= maxDistance) {
          console.log(`   ✅ ELIGIBLE: Within ${maxDistance/1000}km radius`);
          eligibleCount++;
          eligibleDonations.push({
            id: doc.id,
            distance: distanceKm,
            status: donationData.status
          });
        } else {
          console.log(`   ❌ REJECTED: Beyond ${maxDistance/1000}km radius`);
        }
      } catch (geoError) {
        console.log(`   ❌ ERROR calculating distance:`, geoError.message);
      }
    });

    // 5. Summary
    console.log("\n📊 FINAL SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total donations checked: ${processedCount}`);
    console.log(`Eligible donations for NGO '${ngoData.name}': ${eligibleCount}`);
    
    if (eligibleCount > 0) {
      console.log("\n✅ ELIGIBLE DONATIONS:");
      eligibleDonations.forEach(d => {
        console.log(`   - ${d.id} (${d.distance} km away, status: ${d.status})`);
      });
    } else {
      console.log("\n❌ NO ELIGIBLE DONATIONS FOUND");
      console.log("\nPossible reasons:");
      console.log("  1. No donations have coordinates field");
      console.log("  2. All donations are already matched to an NGO");
      console.log("  3. All donations are beyond 15km radius");
      console.log("  4. No donations with 'pending' or 'available' status");
    }

    console.log("\n✅ Diagnostic complete\n");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

diagnoseAvailableDonations();
