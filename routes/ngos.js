const express = require("express");
const jwt = require("jsonwebtoken");
const { db } = require("../config/firebase");

const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "No token provided",
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "daansetu-secret-key-2024"
    );
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: "Invalid token",
    });
  }
};

// NGO registration (file uploads disabled)
router.post("/register", async (req, res) => {
  try {
    const {
      email,
      password,
      name,
      phone,
      address,
      registrationId,
      coordinates,
    } = req.body;

    // File uploads disabled to avoid Firebase Storage costs
    const documentUrls = [];

    // Check if user already exists in users collection
    const usersRef = db.collection("users");
    const emailQuery = await usersRef.where("email", "==", email).get();

    if (!emailQuery.empty) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Check if NGO already exists in pending_ngos collection
    const pendingNgosRef = db.collection("pending_ngos");
    const pendingEmailQuery = await pendingNgosRef
      .where("email", "==", email)
      .get();

    if (!pendingEmailQuery.empty) {
      return res.status(400).json({
        success: false,
        message: "NGO with this email already has a pending registration",
      });
    }

    // Generate a consistent UID
    const uid = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create NGO user document for users collection
    const userData = {
      uid,
      email,
      name,
      phone,
      address,
      registrationId,
      userType: "ngo",
      password: password, // In production, hash this password
      status: "pending_verification",
      createdAt: new Date(),
    };

    // Create NGO document for pending_ngos collection
    const pendingNgoData = {
      uid,
      email,
      name,
      phone,
      address,
      registrationId,
      coordinates: coordinates ? JSON.parse(coordinates) : null,
      verificationDocuments: documentUrls,
      userType: "ngo",
      status: "pending_verification",
      createdAt: new Date(),
    };

    // Store in both collections
    const userDocRef = await db.collection("users").doc(uid).set(userData);
    const pendingDocRef = await db.collection("pending_ngos").doc(uid).set(pendingNgoData);

    // Notify admins via Socket.IO about new NGO registration
    const io = req.app.get('io');
    if (io) {
      io.emit('new-ngo-registration', { 
        id: uid, 
        name: name,
        email: email,
        message: `New NGO registration: ${name}`
      });
      console.log(`Sent new-ngo-registration notification for ${name}`);
    }

    res.status(201).json({
      success: true,
      ngoId: uid,
      message:
        "NGO registration submitted successfully. Awaiting verification.",
    });
  } catch (error) {
    console.error("NGO registration error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to register NGO",
      error: error.message,
    });
  }
});

// Get NGO verification status
router.get("/status", authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== "ngo") {
      return res.status(403).json({
        success: false,
        message: "Only NGOs can access this endpoint",
      });
    }

    const ngoDoc = await db.collection("users").doc(req.user.uid).get();

    if (!ngoDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "NGO not found",
      });
    }

    const ngoData = ngoDoc.data();

    // Log for debugging
    console.log("NGO Status Check:", {
      uid: req.user.uid,
      status: ngoData.status,
      userType: ngoData.userType,
      name: ngoData.name,
    });

    res.json({
      success: true,
      status: ngoData.status,
      ngo: {
        name: ngoData.name,
        email: ngoData.email,
        phone: ngoData.phone,
        address: ngoData.address,
        registrationId: ngoData.registrationId,
        verificationDocuments: ngoData.verificationDocuments || [],
        adminNotes: ngoData.adminNotes || "",
        rejectedAt: ngoData.rejectedAt || null,
        rejectedBy: ngoData.rejectedBy || null,
      },
    });
  } catch (error) {
    console.error("Get NGO status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get NGO status",
      error: error.message,
    });
  }
});

// Update NGO coordinates
router.put("/coordinates", authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== "ngo") {
      return res.status(403).json({
        success: false,
        message: "Only NGOs can update coordinates",
      });
    }

    const { coordinates } = req.body;

    await db.collection("users").doc(req.user.uid).update({
      coordinates,
      updatedAt: new Date(),
    });

    res.json({
      success: true,
      message: "Coordinates updated successfully",
    });
  } catch (error) {
    console.error("Update coordinates error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update coordinates",
      error: error.message,
    });
  }
});

// Get NGO details by ID (for donation details page)
router.get("/details/:ngoId", authenticateToken, async (req, res) => {
  try {
    const { ngoId } = req.params;

    const ngoDoc = await db.collection("users").doc(ngoId).get();

    if (!ngoDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "NGO not found",
      });
    }

    const ngoData = ngoDoc.data();

    // Return only public information
    res.json({
      success: true,
      name: ngoData.name,
      email: ngoData.email,
      phone: ngoData.phone,
      address: ngoData.address,
      registrationId: ngoData.registrationId,
      status: ngoData.status,
    });
  } catch (error) {
    console.error("Get NGO details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get NGO details",
      error: error.message,
    });
  }
});

// Get NGO statistics (for donation details page)
router.get("/statistics/:ngoId", authenticateToken, async (req, res) => {
  try {
    const { ngoId } = req.params;

    // Get all donations for this NGO
    const donationsSnapshot = await db
      .collection("donations")
      .where("matchedNgoId", "==", ngoId)
      .get();

    const totalDonations = donationsSnapshot.size;
    let completedDonations = 0;

    donationsSnapshot.forEach((doc) => {
      const donation = doc.data();
      if (donation.status === "completed") {
        completedDonations++;
      }
    });

    const successRate = totalDonations > 0 
      ? Math.round((completedDonations / totalDonations) * 100) 
      : 0;

    res.json({
      success: true,
      totalDonations,
      completedDonations,
      successRate,
    });
  } catch (error) {
    console.error("Get NGO statistics error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get NGO statistics",
      error: error.message,
    });
  }
});

// Debug endpoint to check NGO status
router.get("/debug/status/:ngoId", async (req, res) => {
  try {
    const { ngoId } = req.params;

    // Check in users collection
    const userDoc = await db.collection("users").doc(ngoId).get();
    const userData = userDoc.exists ? userDoc.data() : null;

    // Check in pending_ngos collection
    const pendingDoc = await db.collection("pending_ngos").doc(ngoId).get();
    const pendingData = pendingDoc.exists ? pendingDoc.data() : null;

    res.json({
      success: true,
      usersCollection: userData,
      pendingNgosCollection: pendingData,
      userExists: userDoc.exists,
      pendingExists: pendingDoc.exists,
    });
  } catch (error) {
    console.error("Debug NGO status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get NGO status",
      error: error.message,
    });
  }
});

module.exports = router;