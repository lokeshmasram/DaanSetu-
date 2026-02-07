const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { db } = require("../config/firebase");
const { getDistance } = require("geolib");
const crypto = require('crypto');
const { sendOtpEmail, sendResetEmail } = require('../utils/email');

const router = express.Router();

// Simple in-memory rate limiter for OTP requests
// Structure: { key: { count, firstRequestAt, lastRequestAt } }
const otpRateLimitStore = new Map();
const OTP_LIMIT_PER_HOUR = 5; // max requests per email per hour
const OTP_COOLDOWN_SECONDS = 30; // minimum seconds between requests per email

function checkOtpRateLimit(key) {
  const now = Date.now();
  const entry = otpRateLimitStore.get(key) || { count: 0, firstRequestAt: now, lastRequestAt: 0 };

  // Reset count after 1 hour
  if (now - entry.firstRequestAt > 60 * 60 * 1000) {
    entry.count = 0;
    entry.firstRequestAt = now;
  }

  // Cooldown check
  if (now - entry.lastRequestAt < OTP_COOLDOWN_SECONDS * 1000) {
    const wait = Math.ceil((OTP_COOLDOWN_SECONDS * 1000 - (now - entry.lastRequestAt)) / 1000);
    return { allowed: false, reason: `Please wait ${wait}s before requesting another OTP` };
  }

  if (entry.count >= OTP_LIMIT_PER_HOUR) {
    return { allowed: false, reason: 'Hourly OTP request limit reached. Please try again later.' };
  }

  // Update entry
  entry.count += 1;
  entry.lastRequestAt = now;
  otpRateLimitStore.set(key, entry);
  return { allowed: true };
}

// Check if Firebase is properly initialized
const isFirebaseReady = () => {
  return db && typeof db.collection === "function";
};

// User registration
router.post("/register", async (req, res) => {
  try {
    // Check if Firebase is ready
    if (!isFirebaseReady()) {
      console.error("Firebase not initialized - db:", db);
      return res.status(500).json({
        success: false,
        message:
          "Database service not available. Please check server configuration.",
        error: "Firebase database not initialized",
      });
    }

    const { email, password, userType, name, phone, address, registrationId } =
      req.body;

    // Validate required fields
    if (!email || !password || !userType || !name || !phone || !address) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    // Validate user type
    const validUserTypes = ["donor", "ngo", "volunteer"];
    if (!validUserTypes.includes(userType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user type. Must be donor, ngo, or volunteer",
      });
    }

    // Check if user already exists
    const usersRef = db.collection("users");
    const emailQuery = await usersRef.where("email", "==", email).get();

    if (!emailQuery.empty) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Create user document in Firestore with a generated UID
    const uid = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Hash the password before storing
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userData = {
      uid,
      email,
      name,
      phone,
      address,
      userType,
      password: hashedPassword,
      createdAt: new Date(),
      status: userType === "ngo" ? "pending_verification" : "active",
      loginStatus: "logged_out",
    };

    if (userType === "ngo") {
      if (!registrationId) {
        return res.status(400).json({
          success: false,
          message: "Registration ID is required for NGO accounts",
        });
      }
      userData.registrationId = registrationId;
      userData.verificationDocuments = [];

      // For NGO registrations, also add to pending_ngos collection for admin verification
      const pendingNgoData = {
        uid,
        email,
        name,
        phone,
        address,
        registrationId,
        coordinates: null, // Will be updated later
        verificationDocuments: [],
        userType: "ngo",
        status: "pending_verification",
        createdAt: new Date(),
      };
      await db.collection("pending_ngos").doc(uid).set(pendingNgoData);
    }

    // Save user to database
    console.log("Attempting to save user to Firestore...");
    await db.collection("users").doc(uid).set(userData);
    console.log("User saved successfully to Firestore");

    // Generate JWT token
    const token = jwt.sign(
      { uid, userType },
      process.env.JWT_SECRET || "daansetu-secret-key-2024",
      { expiresIn: "24h" }
    );

    console.log(`✅ User registered successfully: ${email} (${userType})`);

    res.status(201).json({
      success: true,
      message: "Registration successful!",
      token,
      user: {
        uid,
        email,
        name,
        userType,
        status: userData.status,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    // Provide more specific error messages
    let errorMessage = "Registration failed";
    if (error.code === "permission-denied") {
      errorMessage =
        "Database access denied. Please check Firebase configuration.";
    } else if (error.code === "unavailable") {
      errorMessage = "Database service unavailable. Please try again later.";
    } else if (error.message) {
      errorMessage = error.message;
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message,
    });
  }
});

// User login
router.post("/login", async (req, res) => {
  try {
    // Check if Firebase is ready
    if (!isFirebaseReady()) {
      console.error("Firebase not initialized - db:", db);
      return res.status(500).json({
        success: false,
        message:
          "Database service not available. Please check server configuration.",
        error: "Firebase database not initialized",
      });
    }

    const { email, password } = req.body;

    // Static admin login support
    if (email === "admin" && password === "admin123") {
      // Generate JWT token for admin
      const token = jwt.sign(
        { uid: "admin", userType: "admin" },
        process.env.JWT_SECRET || "daansetu-secret-key-2024",
        { expiresIn: "24h" }
      );
      return res.json({
        success: true,
        message: "Admin login successful!",
        token,
        user: {
          uid: "admin",
          email: "admin",
          name: "Admin",
          userType: "admin",
          status: "active",
        },
      });
    }

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Get user by email from Firestore
    console.log("🔍 Attempting to query user from Firestore for email:", email);
    const usersRef = db.collection("users");
    const emailQuery = await usersRef.where("email", "==", email).get();
    console.log(
      "📊 Query result:",
      emailQuery.empty
        ? "No user found"
        : `User found: ${emailQuery.docs.length} docs`
    );

    if (emailQuery.empty) {
      console.log("❌ No user found with email:", email);
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const userDoc = emailQuery.docs[0];
    const userData = userDoc.data();
    console.log("👤 Found user data:", {
      email: userData.email,
      userType: userData.userType,
      hasPassword: !!userData.password,
    });

    // Check password using bcrypt. If stored password is plaintext (legacy), migrate it to hashed on successful login
    const stored = userData.password || '';
    let passwordMatches = false;

    console.log("🔐 Checking password for user:", email);

    try {
      // Detect bcrypt hash (starts with $2a$ or $2b$ or $2y$)
      if (typeof stored === 'string' && stored.startsWith('$2')) {
        passwordMatches = await bcrypt.compare(password, stored);
      } else {
        // Legacy plaintext stored (not recommended). Compare directly and migrate.
        if (password === stored) {
          passwordMatches = true;
          // Migrate to hashed password
          try {
            const salt = await bcrypt.genSalt(10);
            const hashed = await bcrypt.hash(password, salt);
            await db.collection('users').doc(userData.uid).update({ password: hashed });
            console.log('🔁 Migrated plaintext password to hashed for user:', email);
          } catch (migrateErr) {
            console.warn('Failed to migrate plaintext password for', email, migrateErr);
          }
        }
      }
    } catch (err) {
      console.error('Error comparing password for', email, err);
    }

    if (!passwordMatches) {
      console.log('❌ Password mismatch for user:', email);
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Check if NGO is verified (but allow rejected NGOs to log in)
    if (userData.userType === "ngo" && userData.status === "pending_verification") {
      console.log(`⚠️ NGO login pending verification - Status: ${userData.status}, UID: ${userData.uid}`);
      // Allow login but with a warning - the dashboard will handle the message
    }
    
    // Log successful NGO login
    if (userData.userType === "ngo") {
      console.log(`✅ NGO login allowed - Status: ${userData.status}, UID: ${userData.uid}`);
    }

    // Update user login status
    await db.collection("users").doc(userData.uid).update({
      loginStatus: "logged_in",
      lastLoginAt: new Date()
    });

    // Generate JWT token
    const token = jwt.sign(
      { uid: userData.uid, userType: userData.userType },
      process.env.JWT_SECRET || "daansetu-secret-key-2024",
      { expiresIn: "24h" }
    );

    console.log(
      `✅ User logged in successfully: ${email} (${userData.userType})`
    );

    res.json({
      success: true,
      message: "Login successful!",
      token,
      user: {
        uid: userData.uid,
        email: userData.email,
        name: userData.name,
        userType: userData.userType,
        status: userData.status,
        loginStatus: "logged_in",
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    // Provide more specific error messages
    let errorMessage = "Login failed";
    if (error.code === "permission-denied") {
      errorMessage =
        "Database access denied. Please check Firebase configuration.";
    } else if (error.code === "unavailable") {
      errorMessage = "Database service unavailable. Please try again later.";
    } else if (error.message) {
      errorMessage = error.message;
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message,
    });
  }
});

// Get user profile
router.get("/profile", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "daansetu-secret-key-2024"
    );

    // Handle admin user
    if (decoded.uid === "admin") {
      return res.json({
        success: true,
        user: {
          uid: "admin",
          name: "Admin",
          userType: "admin",
          status: "active",
        },
      });
    }

    const userDoc = await db.collection("users").doc(decoded.uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const userData = userDoc.data();
    delete userData.password; // Don't send password

    res.json({
      success: true,
      user: userData,
    });
  } catch (error) {
    console.error("Profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get profile",
      error: error.message,
    });
  }
});

// Update user profile
router.put("/profile", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "daansetu-secret-key-2024"
    );
    const { name, phone, address } = req.body;

    await db.collection("users").doc(decoded.uid).update({
      name,
      phone,
      address,
      updatedAt: new Date(),
    });

    res.json({
      success: true,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message,
    });
  }
});

// Generate OTP and send via email
router.post("/request-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    // Rate limit per email
    const emailLimit = checkOtpRateLimit(`email:${email}`);
    if (!emailLimit.allowed) {
      return res.status(429).json({ success: false, message: emailLimit.reason });
    }

    // Rate limit per IP (best-effort, req.ip may be proxied depending on setup)
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const ipLimit = checkOtpRateLimit(`ip:${ip}`);
    if (!ipLimit.allowed) {
      return res.status(429).json({ success: false, message: ipLimit.reason });
    }

    // Check if user exists
    const usersRef = db.collection("users");
    const emailQuery = await usersRef.where("email", "==", email).get();
    
    if (emailQuery.empty) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email"
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes from now

    // Log OTP (useful for local demo)
    console.log(`OTP for ${email}: ${otp}`);

    // Persist OTP and expiry in a password_resets collection so it can be verified later
    try {
      await db.collection("password_resets").doc(email).set({
        otp,
        otpExpiry,
        createdAt: new Date()
      });
    } catch (err) {
      console.error("Failed to persist OTP:", err);
      // continue — still try to send email; but inform if persistence fails
    }

    // Send OTP via email
    const emailResult = await sendOtpEmail(email, otp);
    if (!emailResult.success) {
      console.error('Failed to send OTP email:', emailResult.error);
      // If running in development, return the OTP in the response so local testing works
      if (process.env.NODE_ENV === 'development') {
        console.warn('Running in development — returning OTP in response for testing');
        return res.status(200).json({
          success: true,
          message: 'OTP generated (development). Email not sent; OTP returned in response for testing.',
          otp
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to send OTP. Please try again later."
      });
    }

    res.status(200).json({
      success: true,
      message: "OTP sent successfully"
    });

  } catch (error) {
    console.error("Error in request-otp:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while processing your request"
    });
  }
});

// Reset password with OTP verification
router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP, and new password are required"
      });
    }

    // Verify OTP from password_resets collection
    const resetRef = db.collection("password_resets").doc(email);
    const resetDoc = await resetRef.get();

    if (!resetDoc.exists) {
      return res.status(400).json({ success: false, message: "No OTP request found for this email" });
    }

    const resetData = resetDoc.data();
    // Accept both timestamp numbers and Date objects for expiry
    const storedOtp = resetData.otp;
    const storedExpiry = resetData.otpExpiry || (resetData.otpExpiryMillis && resetData.otpExpiryMillis);

    if (!storedOtp || storedOtp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    if (storedExpiry && Date.now() > storedExpiry) {
      return res.status(400).json({ success: false, message: "OTP has expired" });
    }

    // Find the user by email
    const usersRef = db.collection("users");
    const emailQuery = await usersRef.where("email", "==", email).get();
    if (emailQuery.empty) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const userDoc = emailQuery.docs[0];
    const userData = userDoc.data();
    const uid = userData.uid;

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(newPassword, salt);

    // Update user's password in database
    await db.collection("users").doc(uid).update({
      password: hashed,
      updatedAt: new Date()
    });

    // Delete the used OTP record
    try {
      await resetRef.delete();
    } catch (err) {
      console.warn("Failed to delete password_resets record:", err);
    }

    console.log(`✅ Password reset successful for ${email}`);

    res.status(200).json({
      success: true,
      message: "Password reset successfully"
    });

  } catch (error) {
    console.error("Error in reset-password:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while resetting your password"
    });
  }
});

// Verify OTP without resetting password (used by front-end flow)
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    const resetRef = db.collection('password_resets').doc(email);
    const resetDoc = await resetRef.get();
    if (!resetDoc.exists) {
      return res.status(400).json({ success: false, message: 'No OTP request found for this email' });
    }

    const resetData = resetDoc.data();
    const storedOtp = resetData.otp;
    const storedExpiry = resetData.otpExpiry;

    if (!storedOtp || storedOtp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    if (storedExpiry && Date.now() > storedExpiry) {
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }

    return res.json({ success: true, message: 'OTP verified' });
  } catch (error) {
    console.error('Error in verify-otp:', error);
    res.status(500).json({ success: false, message: 'An error occurred while verifying OTP' });
  }
});

// Logout endpoint
router.post("/logout", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    // Verify and decode token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "daansetu-secret-key-2024"
    );

    // Update user logout status
    if (decoded.uid && decoded.uid !== "admin") {
      await db.collection("users").doc(decoded.uid).update({
        loginStatus: "logged_out",
        lastLogoutAt: new Date()
      });
      
      console.log(`✅ User logged out: ${decoded.uid}`);
    }

    res.json({
      success: true,
      message: "Logout successful!",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Logout failed",
      error: error.message,
    });
  }
});

// Debug endpoint to check all users (remove in production)
router.get("/debug/users", async (req, res) => {
  try {
    console.log("🔍 Debug: Fetching all users from Firestore...");
    const usersSnapshot = await db.collection("users").get();
    const users = [];

    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      users.push({
        id: doc.id,
        email: userData.email,
        name: userData.name,
        userType: userData.userType,
        status: userData.status,
        hasPassword: !!userData.password,
      });
    });

    console.log("📊 Found users:", users.length);
    res.json({
      success: true,
      count: users.length,
      users: users,
    });
  } catch (error) {
    console.error("Debug users error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message,
    });
  }
});

// Debug endpoint to check specific user (remove in production)
router.get("/debug/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    console.log("🔍 Debug: Fetching user from Firestore:", userId);
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const userData = userDoc.data();
    console.log("👤 Found user data:", userData);

    res.json({
      success: true,
      user: {
        id: userDoc.id,
        email: userData.email,
        name: userData.name,
        userType: userData.userType,
        status: userData.status,
        hasPassword: !!userData.password,
      },
    });
  } catch (error) {
    console.error("Debug user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
      error: error.message,
    });
  }
});

// Forgot password endpoint
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Check if user exists
    const usersRef = db.collection("users");
    const emailQuery = await usersRef.where("email", "==", email).get();

    if (emailQuery.empty) {
      // Don't reveal if email exists or not for security
      return res.json({
        success: true,
        message: "If an account with that email exists, a password reset link has been sent.",
      });
    }

    // Check if user has a valid user type (donor, ngo, or volunteer)
    const userDoc = emailQuery.docs[0];
    const userData = userDoc.data();
    const validUserTypes = ["donor", "ngo", "volunteer"];

    if (!userData.userType || !validUserTypes.includes(userData.userType)) {
      // User exists but is not a valid user type (e.g., admin), don't send reset link
      return res.json({
        success: true,
        message: "If an account with that email exists, a password reset link has been sent.",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour

    // Store reset token in user document
    await usersRef.doc(userDoc.id).update({
      resetToken,
      resetTokenExpiry,
    });

    // Send reset email
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    const emailResult = await sendResetEmail(email, resetLink);

    if (!emailResult.success) {
      console.error('Failed to send reset email:', emailResult.error);
      // Still return success for security (don't reveal email sending failures)
    }

    res.json({
      success: true,
      message: "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process request",
      error: error.message,
    });
  }
});

// Reset password with token endpoint
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Token and new password are required",
      });
    }

    // Validate password strength
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Find user with matching reset token
    const usersRef = db.collection("users");
    const tokenQuery = await usersRef.where("resetToken", "==", token).get();

    if (tokenQuery.empty) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    const userDoc = tokenQuery.docs[0];
    const userData = userDoc.data();

    // Check if token is expired
    if (!userData.resetTokenExpiry || userData.resetTokenExpiry < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "Reset token has expired",
      });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user password and clear reset token
    await usersRef.doc(userDoc.id).update({
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    });

    res.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reset password",
      error: error.message,
    });
  }
});

module.exports = router;
