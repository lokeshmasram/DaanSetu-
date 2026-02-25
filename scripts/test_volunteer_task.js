const admin = require('firebase-admin');
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

async function testTaskAcceptance() {
  try {
    console.log("\n🔍 Testing Task Acceptance Flow\n");
    console.log("=".repeat(60));

    // Find a task with status "assigned"
    console.log("\n📋 Looking for assigned tasks...");
    const assignedTasks = await db
      .collection("volunteer_tasks")
      .where("status", "==", "assigned")
      .get();

    console.log(`Found ${assignedTasks.size} assigned tasks`);

    if (assignedTasks.empty) {
      console.log("\n❌ No assigned tasks found!");
      console.log("Let's check all tasks:");
      
      const allTasks = await db.collection("volunteer_tasks").get();
      console.log(`\nTotal tasks in database: ${allTasks.size}`);
      
      allTasks.forEach(doc => {
        const data = doc.data();
        console.log(`\n  Task: ${doc.id}`);
        console.log(`    Status: ${data.status}`);
        console.log(`    Assigned to: ${data.assignedVolunteerId || 'none'}`);
        console.log(`    NGO ID: ${data.ngoId}`);
      });
    } else {
      assignedTasks.forEach(doc => {
        const data = doc.data();
        console.log(`\n✅ Task: ${doc.id}`);
        console.log(`   Status: ${data.status}`);
        console.log(`   Assigned to: ${data.assignedVolunteerId}`);
        console.log(`   Assigned at: ${data.assignedAt?.toDate()}`);
        console.log(`   NGO ID: ${data.ngoId}`);
        console.log(`   Title: ${data.title}`);
      });
    }

    // Test the query that the frontend uses
    console.log("\n\n📋 Testing volunteer query (simulating user_1738086663594_3nnuvcv4w)...");
    const volunteerId = "user_1738086663594_3nnuvcv4w";
    
    console.log("\n1️⃣ Query: status == 'available'");
    const availableQuery = await db
      .collection("volunteer_tasks")
      .where("status", "==", "available")
      .get();
    console.log(`   Result: ${availableQuery.size} tasks`);
    
    console.log("\n2️⃣ Query: assignedVolunteerId == '${volunteerId}'");
    const assignedQuery = await db
      .collection("volunteer_tasks")
      .where("assignedVolunteerId", "==", volunteerId)
      .get();
    console.log(`   Result: ${assignedQuery.size} tasks`);
    
    assignedQuery.forEach(doc => {
      const data = doc.data();
      console.log(`\n   ✅ Task ${doc.id}:`);
      console.log(`      Status: ${data.status}`);
      console.log(`      Assigned to: ${data.assignedVolunteerId}`);
    });

    console.log("\n✅ Test complete\n");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

testTaskAcceptance();
