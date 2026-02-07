// Simple Firestore connectivity test
const { db } = require("./config/firebase");

async function testFirestore() {
  try {
    console.log("🔍 Testing Firestore connectivity...");

    // Test write
    const testDoc = {
      test: true,
      timestamp: new Date(),
      message: "Firestore test",
    };

    await db.collection("test").doc("connectivity").set(testDoc);
    console.log("✅ Write test successful");

    // Test read
    const doc = await db.collection("test").doc("connectivity").get();
    if (doc.exists) {
      console.log("✅ Read test successful:", doc.data());
    } else {
      console.log("❌ Read test failed: Document not found");
    }

    // Test query
    const querySnapshot = await db
      .collection("test")
      .where("test", "==", true)
      .get();
    console.log(
      "✅ Query test successful:",
      querySnapshot.size,
      "documents found"
    );

    // Clean up
    await db.collection("test").doc("connectivity").delete();
    console.log("✅ Cleanup successful");
  } catch (error) {
    console.error("❌ Firestore test failed:", error.message);
    console.error("Error code:", error.code);

    if (error.code === "permission-denied") {
      console.log("\n🚨 SOLUTION: Update your Firestore Security Rules to:");
      console.log("rules_version = '2';");
      console.log("service cloud.firestore {");
      console.log("  match /databases/{database}/documents {");
      console.log("    match /{document=**} {");
      console.log("      allow read, write: if true;");
      console.log("    }");
      console.log("  }");
      console.log("}");
    }
  }
}

testFirestore();
