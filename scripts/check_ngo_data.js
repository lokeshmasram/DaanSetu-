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

async function checkNGOData() {
  try {
    console.log("🔍 Checking NGO data...\n");
    
    // Check NGOs (users collection)
    const usersSnapshot = await db.collection('users')
      .where('userType', '==', 'ngo')
      .get();
    
    console.log(`📊 Total NGOs in database: ${usersSnapshot.size}\n`);
    
    const ngos = [];
    usersSnapshot.forEach(doc => {
      ngos.push({
        id: doc.id,
        name: doc.data().name,
        status: doc.data().status
      });
    });
    
    console.log("NGOs:");
    ngos.forEach(ngo => {
      console.log(`  - ${ngo.id}: ${ngo.name} (${ngo.status})`);
    });
    
    // Check donations
    console.log("\n🔍 Checking donations...\n");
    const donationsSnapshot = await db.collection('donations').limit(10).get();
    
    console.log(`📊 Sample donations (first 10):\n`);
    
    for (const doc of donationsSnapshot.docs) {
      const data = doc.data();
      console.log(`Donation ${doc.id.substring(0, 12)}...`);
      console.log(`  Status: ${data.status}`);
      console.log(`  Matched NGO ID: ${data.matchedNgoId || 'None'}`);
      console.log(`  NGO Name in data: ${data.ngoName || 'None'}`);
      
      if (data.matchedNgoId) {
        const ngoDoc = await db.collection('users').doc(data.matchedNgoId).get();
        if (ngoDoc.exists) {
          console.log(`  ✅ NGO exists: ${ngoDoc.data().name}`);
        } else {
          console.log(`  ❌ NGO NOT FOUND in database`);
        }
      }
      console.log('');
    }
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkNGOData();
