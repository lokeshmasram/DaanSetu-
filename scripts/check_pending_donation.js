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
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkPendingDonation() {
  try {
    console.log("🔍 Checking pending donation...\n");
    
    // Find the pending donation from the log
    const donationId = 'JbjULIMn';
    
    console.log(`📦 Looking for donation: ${donationId}\n`);
    
    // Try to get documents that start with this prefix
    const allDonations = await db.collection('donations').get();
    
    let foundDonation = null;
    allDonations.forEach(doc => {
      if (doc.id.startsWith(donationId)) {
        foundDonation = { id: doc.id, ...doc.data() };
      }
    });
    
    if (!foundDonation) {
      console.log("❌ Donation not found with that prefix. Checking all pending donations...\n");
      
      const pendingSnapshot = await db.collection('donations')
        .where('status', '==', 'pending')
        .get();
        
      console.log(`📊 Total pending donations: ${pendingSnapshot.size}\n`);
      
      pendingSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`Donation ${doc.id}:`);
        console.log(`  Status: ${data.status}`);
        console.log(`  Item: ${data.itemType}`);
        console.log(`  Coordinates: ${data.coordinates ? `${data.coordinates.lat}, ${data.coordinates.lng}` : 'MISSING'}`);
        console.log(`  Matched NGO: ${data.matchedNgoId || 'None'}`);
        console.log(`  Created: ${data.createdAt?.toDate ? data.createdAt.toDate() : 'N/A'}`);
        console.log('');
      });
    } else {
      console.log("✅ Found donation:", foundDonation.id);
      console.log("📋 Donation details:");
      console.log(`  Status: ${foundDonation.status}`);
      console.log(`  Item Type: ${foundDonation.itemType}`);
      console.log(`  Quantity: ${foundDonation.quantity}`);
      console.log(`  Pickup Address: ${foundDonation.pickupAddress}`);
      console.log(`  Coordinates: ${foundDonation.coordinates ? `${foundDonation.coordinates.lat}, ${foundDonation.coordinates.lng}` : '❌ MISSING'}`);
      console.log(`  Matched NGO: ${foundDonation.matchedNgoId || 'None'}`);
      console.log(`  Donor ID: ${foundDonation.donorId}`);
      console.log(`  Created At: ${foundDonation.createdAt?.toDate ? foundDonation.createdAt.toDate() : 'N/A'}`);
      console.log('');
      
      if (!foundDonation.coordinates) {
        console.log("⚠️  WARNING: Donation has NO COORDINATES!");
        console.log("   NGOs can only see donations with coordinates within 15km");
        console.log('');
      }
    }
    
    // Check which NGOs can see it
    console.log("🏢 Checking NGO locations...\n");
    const ngosSnapshot = await db.collection('users')
      .where('userType', '==', 'ngo')
      .where('status', '==', 'verified')
      .get();
    
    console.log(`📊 Total verified NGOs: ${ngosSnapshot.size}\n`);
    
    let ngosWithCoordinates = 0;
    ngosSnapshot.forEach(doc => {
      const ngoData = doc.data();
      const hasCoordinates = !!ngoData.coordinates;
      if (hasCoordinates) ngosWithCoordinates++;
      
      console.log(`NGO: ${ngoData.name}`);
      console.log(`  ID: ${doc.id}`);
      console.log(`  Status: ${ngoData.status}`);
      console.log(`  Coordinates: ${hasCoordinates ? `${ngoData.coordinates.lat}, ${ngoData.coordinates.lng}` : '❌ MISSING'}`);
      console.log('');
    });
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total verified NGOs: ${ngosSnapshot.size}`);
    console.log(`   NGOs with coordinates: ${ngosWithCoordinates}`);
    console.log(`   NGOs without coordinates: ${ngosSnapshot.size - ngosWithCoordinates}`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkPendingDonation();
