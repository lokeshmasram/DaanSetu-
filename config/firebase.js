const admin = require("firebase-admin");
const { initializeApp } = require("firebase/app");
const {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  setDoc,
  query,
  where,
} = require("firebase/firestore");

// Check if Firebase environment variables are set
const hasFirebaseConfig =
  process.env.FIREBASE_API_KEY && process.env.FIREBASE_PROJECT_ID;

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
};

let adminApp, db, auth, firebaseApp, clientDb;

// Initialize Firebase only if configuration is available
if (hasFirebaseConfig) {
  try {
    // Initialize Firebase Client (for frontend operations)
    firebaseApp = initializeApp(firebaseConfig);

    // Initialize Firestore Client SDK
    clientDb = getFirestore(firebaseApp);

    console.log("✅ Firebase Client SDK initialized successfully");

    // Check if Admin SDK credentials are available
    const hasAdminCredentials =
      process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL;

    if (hasAdminCredentials) {
      // Initialize Firebase Admin SDK
      const serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url:
          "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
      };

      // Initialize Firebase Admin
      if (!admin.apps.length) {
        adminApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          storageBucket: firebaseConfig.storageBucket,
        });
      }

      // Get Firestore and Auth instances from Admin SDK
      db = admin.firestore();
      auth = admin.auth();

      console.log("✅ Firebase Admin SDK initialized successfully");
    } else {
      console.log("⚠️  Firebase Admin SDK credentials not found");
      console.log("⚠️  Running with Client SDK only");

      // Use Client SDK for database operations
      db = {
        collection: (collectionName) => ({
          where: (field, operator, value) => ({
            get: async () => {
              try {
                const q = query(
                  collection(clientDb, collectionName),
                  where(field, operator, value)
                );
                const querySnapshot = await getDocs(q);
                const docs = querySnapshot.docs.map((d) => ({ id: d.id, data: () => d.data() }));
                return {
                  empty: querySnapshot.empty,
                  size: querySnapshot.size,
                  docs,
                  forEach: (cb) => docs.forEach((doc) => cb({ id: doc.id, data: doc.data })),
                };
              } catch (error) {
                console.error("Client SDK query error:", error);
                throw error;
              }
            },
          }),
          doc: (docId) => ({
            set: async (data) => {
              try {
                if (docId) {
                  // Update existing document
                  await setDoc(doc(clientDb, collectionName, docId), data);
                } else {
                  // Create new document
                  await addDoc(collection(clientDb, collectionName), data);
                }
              } catch (error) {
                console.error("Client SDK set error:", error);
                throw error;
              }
            },
            get: async () => {
              try {
                const docRef = doc(clientDb, collectionName, docId);
                const docSnap = await getDoc(docRef);
                return {
                  exists: docSnap.exists(),
                  data: () => docSnap.data(),
                };
              } catch (error) {
                console.error("Client SDK get error:", error);
                throw error;
              }
            },
            update: async (data) => {
              try {
                await setDoc(doc(clientDb, collectionName, docId), data, {
                  merge: true,
                });
              } catch (error) {
                console.error("Client SDK update error:", error);
                throw error;
              }
            },
          }),
        }),
      };

      console.log("✅ Using Firebase Client SDK for database operations");
    }
  } catch (error) {
    console.error("❌ Firebase initialization failed:", error.message);
    console.log("⚠️  Running in demo mode without Firebase backend");
  }
} else {
  console.log("⚠️  Firebase environment variables not found");
  console.log("⚠️  Running in demo mode without Firebase backend");
  console.log(
    "📝 To enable full functionality, create a .env file with Firebase configuration"
  );
}

// Initialize Firebase services
if (!db) {
  console.error("❌ Firestore database not initialized");
}

if (!auth) {
  console.log("⚠️  Firebase Auth not initialized (Admin SDK not configured)");
  console.log("✅ App will use custom authentication with Firestore");
}

// Mock storage for demo mode (disabled to avoid paid service)
const storage = {
  bucket: () => ({
    file: () => ({
      save: () => Promise.resolve(),
      getSignedUrl: () => Promise.resolve(["demo-url"]),
    }),
  }),
};

if (!firebaseApp) {
  console.error("❌ Firebase app not initialized");
}

module.exports = {
  admin: adminApp || admin,
  db,
  auth,
  storage,
  firebaseApp,
  clientDb,
};
