const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Initialize Firebase Admin
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

async function checkVolunteerID() {
  try {
    console.log("\n🔍 Checking Volunteer ID Mismatch\n");
    console.log("=".repeat(60));

    // Get all volunteers from users collection
    console.log("\n📋 VOLUNTEERS IN DATABASE:");
    console.log("-".repeat(60));
    
    const volunteers = await db
      .collection("users")
      .where("userType", "==", "volunteer")
      .get();

    console.log(`Found ${volunteers.size} volunteers\n`);

    const volunteerIds = [];
    volunteers.forEach(doc => {
      const data = doc.data();
      volunteerIds.push(data.uid);
      console.log(`  Volunteer: ${data.name}`);
      console.log(`    UID: ${data.uid}`);
      console.log(`    Email: ${data.email}`);
      console.log();
    });

    // Get all assigned tasks and check their assignedVolunteerId
    console.log("\n📋 ASSIGNED TASKS:");
    console.log("-".repeat(60));
    
    const assignedTasks = await db
      .collection("volunteer_tasks")
      .where("status", "==", "assigned")
      .get();

    console.log(`Found ${assignedTasks.size} assigned tasks\n`);

    const taskVolunteerIds = new Set();
    assignedTasks.forEach(doc => {
      const data = doc.data();
      taskVolunteerIds.add(data.assignedVolunteerId);
      console.log(`  Task: ${data.title}`);
      console.log(`    Assigned to ID: ${data.assignedVolunteerId}`);
      console.log(`    Status: ${data.status}`);
      console.log();
    });

    // Check for mismatches
    console.log("\n🔍 CHECKING FOR MISMATCHES:");
    console.log("-".repeat(60));
    
    let hasMatch = false;
    taskVolunteerIds.forEach(taskVolId => {
      const matchingVolunteer = volunteerIds.find(volId => volId === taskVolId);
      if (matchingVolunteer) {
        console.log(`  ✅ Task volunteer ID ${taskVolId} matches a volunteer in users collection`);
        hasMatch = true;
      } else {
        console.log(`  ❌ Task volunteer ID ${taskVolId} does NOT match any volunteer in users collection!`);
        console.log(`     This volunteer ID exists in tasks but not in the users collection.`);
      }
    });

    if (!hasMatch && taskVolunteerIds.size > 0 && volunteerIds.length > 0) {
      console.log("\n⚠️ CRITICAL ISSUE FOUND!");
      console.log("   Tasks are assigned to volunteer IDs that don't exist in the users collection!");
      console.log("\n   Volunteer IDs in users collection:");
      volunteerIds.forEach(id => console.log(`     - ${id}`));
      console.log("\n   Volunteer IDs in assigned tasks:");
      taskVolunteerIds.forEach(id => console.log(`     - ${id}`));
    }

    console.log("\n✅ Check complete\n");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

checkVolunteerID();
