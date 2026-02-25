const admin = require('firebase-admin');
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

async function checkNGOCoordinates() {
  try {
    console.log("\n🔍 Checking NGO Coordinates...\n");

    const ngoId = "user_1759478764183_pbwg1vhif"; // Lokesh Masram
    const ngoDoc = await db.collection("users").doc(ngoId).get();

    if (!ngoDoc.exists) {
      console.log("❌ NGO not found!");
      return;
    }

    const ngoData = ngoDoc.data();
    console.log("📋 NGO Data:");
    console.log("  Name:", ngoData.name);
    console.log("  Status:", ngoData.status);
    console.log("  Has coordinates field:", !!ngoData.coordinates);
    
    if (ngoData.coordinates) {
      console.log("  Coordinates:", JSON.stringify(ngoData.coordinates, null, 2));
      console.log("  Lat:", ngoData.coordinates.lat);
      console.log("  Lng:", ngoData.coordinates.lng);
    } else {
      console.log("  ❌ No coordinates field found!");
    }

    console.log("\n✅ Check complete\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkNGOCoordinates();
