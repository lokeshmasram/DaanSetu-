const admin = require('firebase-admin');
const { initializeApp } = require('firebase/app');

// Check if Firebase environment variables are set
const hasFirebaseConfig = process.env.FIREBASE_API_KEY && 
                         process.env.FIREBASE_PROJECT_ID && 
                         process.env.FIREBASE_PRIVATE_KEY;

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "demo-api-key",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "demo-project.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "demo-project-id",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "demo-project.appspot.com",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.FIREBASE_APP_ID || "demo-app-id"
};

let adminApp, db, auth, storage, firebaseApp;

// Initialize Firebase only if configuration is available
if (hasFirebaseConfig) {
  try {
    // Initialize Firebase Admin SDK
    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
    };

    // Initialize Firebase Admin
    if (!admin.apps.length) {
      adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: firebaseConfig.storageBucket
      });
    }

    // Initialize Firebase Client
    firebaseApp = initializeApp(firebaseConfig);

    // Get Firestore and Auth instances
    db = admin.firestore();
    auth = admin.auth();
    storage = admin.storage();

    console.log('✅ Firebase initialized successfully');
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error.message);
    console.log('⚠️  Running in demo mode without Firebase backend');
  }
} else {
  console.log('⚠️  Firebase environment variables not found');
  console.log('⚠️  Running in demo mode without Firebase backend');
  console.log('📝 To enable full functionality, create a .env file with Firebase configuration');
}

// Mock Firebase services for demo mode
if (!db) {
  db = {
    collection: () => ({
      doc: () => ({
        set: () => Promise.resolve(),
        get: () => Promise.resolve({ exists: false, data: () => null }),
        update: () => Promise.resolve(),
        delete: () => Promise.resolve()
      }),
      add: () => Promise.resolve({ id: 'demo-id' }),
      where: () => ({ get: () => Promise.resolve({ docs: [] }) }),
      get: () => Promise.resolve({ docs: [] })
    })
  };
}

if (!auth) {
  auth = {
    createUser: () => Promise.resolve({ uid: 'demo-uid' }),
    verifyIdToken: () => Promise.resolve({ uid: 'demo-uid' })
  };
}

if (!storage) {
  storage = {
    bucket: () => ({
      file: () => ({
        save: () => Promise.resolve(),
        getSignedUrl: () => Promise.resolve(['demo-url'])
      })
    })
  };
}

if (!firebaseApp) {
  firebaseApp = { name: 'demo-app' };
}

module.exports = {
  admin: adminApp || admin,
  db,
  auth,
  storage,
  firebaseApp
}; 