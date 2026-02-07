const express = require("express");
const jwt = require("jsonwebtoken");
const { db } = require("../config/firebase");
const { getDistance } = require("geolib");

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

// List a new donation
router.post("/list", authenticateToken, async (req, res) => {
  try {
    const { itemType, quantity, description, pickupAddress, coordinates } =
      req.body;
    const donorId = req.user.uid;

    console.log("Listing donation:", {
      donorId,
      itemType,
      quantity,
      coordinates,
    });

    // Get donor details
    const donorDoc = await db.collection("users").doc(donorId).get();
    const donorData = donorDoc.data();

    if (!donorData) {
      console.error("Donor not found:", donorId);
      return res.status(404).json({
        success: false,
        message: "Donor not found",
      });
    }

    // Create donation document
    const donationData = {
      donorId,
      donorName: donorData.name,
      donorPhone: donorData.phone,
      itemType,
      quantity,
      description,
      pickupAddress,
      status: "available",
      createdAt: new Date(),
      matchedNgoId: null,
      completedAt: null,
    };

    // Only add coordinates if they exist
    if (coordinates) {
      donationData.coordinates = coordinates;
    }

    const donationRef = await db.collection("donations").add(donationData);
    const donationId = donationRef.id;

    console.log("Donation created:", donationId);

    // Find nearby NGOs (within 15km radius) - only if coordinates are provided
    const nearbyNgos = [];
    if (coordinates) {
      const ngosSnapshot = await db
        .collection("users")
        .where("userType", "==", "ngo")
        .where("status", "==", "verified")
        .get();

      const maxDistance = 15000; // 15km in meters

      ngosSnapshot.forEach((doc) => {
        const ngoData = doc.data();
        if (ngoData.coordinates) {
          try {
            const distance = getDistance(
              { latitude: coordinates.lat, longitude: coordinates.lng },
              {
                latitude: ngoData.coordinates.lat,
                longitude: ngoData.coordinates.lng,
              }
            );

            if (distance <= maxDistance) {
              nearbyNgos.push({
                ngoId: doc.id,
                ngoName: ngoData.name,
                distance: distance / 1000, // Convert to km
              });
            }
          } catch (geoError) {
            console.error("Geolocation calculation error:", geoError);
          }
        }
      });
    }

    console.log("Nearby NGOs found:", nearbyNgos.length);

    // Send real-time notifications to nearby NGOs
    const io = req.app.get("io");
    nearbyNgos.forEach((ngo) => {
      io.to(`ngo-${ngo.ngoId}`).emit("new-donation", {
        donationId,
        ...donationData,
        distance: ngo.distance,
      });
    });

    res.status(201).json({
      success: true,
      donationId,
      nearbyNgos: nearbyNgos.length,
      message: "Donation listed successfully",
    });
  } catch (error) {
    console.error("List donation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to list donation",
      error: error.message,
    });
  }
});

// Get available donations for NGOs
router.get("/available", authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== "ngo") {
      return res.status(403).json({
        success: false,
        message: "Only NGOs can access available donations",
      });
    }

    const ngoId = req.user.uid;
    console.log("Fetching available donations for NGO:", ngoId);

    const ngoDoc = await db.collection("users").doc(ngoId).get();
    const ngoData = ngoDoc.data();

    if (!ngoData.coordinates) {
      console.log("NGO has no coordinates, returning empty donations list");
      return res.json({
        success: true,
        donations: [],
      });
    }

    // Get all available donations
    const donationsSnapshot = await db
      .collection("donations")
      .where("status", "==", "available")
      .get();

    console.log("Found available donations:", donationsSnapshot.size);

    const availableDonations = [];
    const maxDistance = 15000; // 15km

    donationsSnapshot.forEach((doc) => {
      const donationData = doc.data();
      if (donationData.coordinates) {
        try {
          const distance = getDistance(
            {
              latitude: ngoData.coordinates.lat,
              longitude: ngoData.coordinates.lng,
            },
            {
              latitude: donationData.coordinates.lat,
              longitude: donationData.coordinates.lng,
            }
          );

          if (distance <= maxDistance) {
            availableDonations.push({
              id: doc.id,
              ...donationData,
              distance: distance / 1000, // Convert to km
            });
          }
        } catch (geoError) {
          console.error(
            "Geolocation calculation error for donation:",
            doc.id,
            geoError
          );
        }
      }
    });

    // Sort by distance
    availableDonations.sort((a, b) => a.distance - b.distance);

    console.log("Returning available donations:", availableDonations.length);
    res.json({
      success: true,
      donations: availableDonations,
    });
  } catch (error) {
    console.error("Get available donations error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get available donations",
      error: error.message,
    });
  }
});

// Accept a donation (NGO action)
router.post("/:donationId/accept", authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== "ngo") {
      return res.status(403).json({
        success: false,
        message: "Only NGOs can accept donations",
      });
    }

    const { donationId } = req.params;
    const ngoId = req.user.uid;

    // Check if donation is still available
    const donationRef = db.collection("donations").doc(donationId);
    const donationDoc = await donationRef.get();

    if (!donationDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Donation not found",
      });
    }

    const donationData = donationDoc.data();

    if (donationData.status !== "available") {
      return res.status(400).json({
        success: false,
        message: "Donation is no longer available",
      });
    }

    // Update donation status
    await donationRef.update({
      status: "matched",
      matchedNgoId: ngoId,
      matchedAt: new Date(),
    });

    // Get NGO details
    const ngoDoc = await db.collection("users").doc(ngoId).get();
    const ngoData = ngoDoc.data();

    // Notify donor
    const io = req.app.get("io");
    io.to(`donor-${donationData.donorId}`).emit("donation-accepted", {
      donationId,
      ngoName: ngoData.name,
      ngoPhone: ngoData.phone,
      ngoAddress: ngoData.address,
    });

    res.json({
      success: true,
      message: "Donation accepted successfully",
    });
  } catch (error) {
    console.error("Accept donation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to accept donation",
      error: error.message,
    });
  }
});

// Mark donation as picked up (Donor action)
router.post("/:donationId/picked-up", authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== "donor") {
      return res.status(403).json({
        success: false,
        message: "Only donors can mark donations as picked up",
      });
    }

    const { donationId } = req.params;
    const donorId = req.user.uid;

    const donationRef = db.collection("donations").doc(donationId);
    const donationDoc = await donationRef.get();

    if (!donationDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Donation not found",
      });
    }

    const donationData = donationDoc.data();

    if (donationData.donorId !== donorId) {
      return res.status(403).json({
        success: false,
        message:
          "Only the donor who created this donation can mark it as picked up",
      });
    }

    if (donationData.status !== "matched") {
      return res.status(400).json({
        success: false,
        message:
          "Donation must be accepted by an NGO before marking as picked up",
      });
    }

    // Update donation status to picked up
    await donationRef.update({
      status: "picked_up",
      pickedUpAt: new Date(),
    });

    // Notify NGO
    const io = req.app.get("io");
    io.to(`ngo-${donationData.matchedNgoId}`).emit("donation-picked-up", {
      donationId,
      message: "Donor has marked the donation as picked up",
    });

    res.json({
      success: true,
      message: "Donation marked as picked up successfully",
    });
  } catch (error) {
    console.error("Mark donation picked up error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark donation as picked up",
      error: error.message,
    });
  }
});

// Mark donation as received (NGO action)
router.post("/:donationId/received", authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== "ngo") {
      return res.status(403).json({
        success: false,
        message: "Only NGOs can mark donations as received",
      });
    }

    const { donationId } = req.params;
    const ngoId = req.user.uid;

    const donationRef = db.collection("donations").doc(donationId);
    const donationDoc = await donationRef.get();

    if (!donationDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Donation not found",
      });
    }

    const donationData = donationDoc.data();

    if (donationData.matchedNgoId !== ngoId) {
      return res.status(403).json({
        success: false,
        message: "Only the matched NGO can mark this donation as received",
      });
    }

    if (donationData.status !== "picked_up") {
      return res.status(400).json({
        success: false,
        message:
          "Donation must be marked as picked up by donor before marking as received",
      });
    }

    // Update donation status to received
    await donationRef.update({
      status: "received",
      receivedAt: new Date(),
    });

    // Notify donor
    const io = req.app.get("io");
    io.to(`donor-${donationData.donorId}`).emit("donation-received", {
      donationId,
      message: "NGO has marked the donation as received",
    });

    res.json({
      success: true,
      message: "Donation marked as received successfully",
    });
  } catch (error) {
    console.error("Mark donation received error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark donation as received",
      error: error.message,
    });
  }
});

// Complete a donation
router.post("/:donationId/complete", authenticateToken, async (req, res) => {
  try {
    const { donationId } = req.params;
    const ngoId = req.user.uid;

    const donationRef = db.collection("donations").doc(donationId);
    const donationDoc = await donationRef.get();

    if (!donationDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Donation not found",
      });
    }

    const donationData = donationDoc.data();

    if (donationData.matchedNgoId !== ngoId) {
      return res.status(403).json({
        success: false,
        message: "Only the matched NGO can complete this donation",
      });
    }

    // If this donation has a pickup task, check if volunteer has completed it
    if (donationData.hasPickupTask && !donationData.volunteerTaskCompleted) {
      return res.status(400).json({
        success: false,
        message:
          "Volunteer must complete pickup task before donation can be marked as completed",
      });
    }

    // Update donation status
    await donationRef.update({
      status: "completed",
      completedAt: new Date(),
    });

    res.json({
      success: true,
      message: "Donation completed successfully",
    });
  } catch (error) {
    console.error("Complete donation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to complete donation",
      error: error.message,
    });
  }
});

// Cancel a donation (only available donations can be cancelled)
router.post("/:donationId/cancel", authenticateToken, async (req, res) => {
  try {
    const { donationId } = req.params;
    const userId = req.user.uid;

    console.log("Cancelling donation:", { donationId, userId });

    // Get donation document
    const donationRef = db.collection("donations").doc(donationId);
    const donationDoc = await donationRef.get();

    if (!donationDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Donation not found",
      });
    }

    const donation = donationDoc.data();

    // Check if user is the donor who created this donation
    if (donation.donorId !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only cancel your own donations",
      });
    }

    // Check if donation is still available (not accepted yet)
    if (donation.status !== "available") {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel donation with status: ${donation.status}. Only available donations can be cancelled.`,
      });
    }

    // Update donation status to cancelled
    await donationRef.update({
      status: "cancelled",
      cancelledAt: new Date(),
      cancelledBy: userId,
    });

    console.log("Donation cancelled successfully:", donationId);

    // Emit real-time update to donor
    const io = req.app.get("io");
    io.to(`donor-${userId}`).emit("donation-cancelled", {
      donationId,
      message: "Donation cancelled successfully",
    });

    res.json({
      success: true,
      message: "Donation cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel donation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cancel donation",
      error: error.message,
    });
  }
});

// Get donor's donation history
// IMPORTANT: This must come BEFORE /:donationId route
router.get("/history", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const userType = req.user.userType;

    console.log("Donation history request:", { userId, userType });

    let donations = [];

    if (userType === "donor") {
      // For donors, get donations by donorId
      console.log("Fetching donations for donor:", userId);
      // Using a try-catch block to handle the case where the composite index doesn't exist
      try {
        const snapshot = await db
          .collection("donations")
          .where("donorId", "==", userId)
          .orderBy("createdAt", "desc")
          .get();

        snapshot.forEach((doc) => {
          donations.push({
            id: doc.id,
            ...doc.data(),
          });
        });
      } catch (queryError) {
        console.error("Donor donation history query error:", queryError);
        // If the composite index doesn't exist, fall back to a query without ordering
        if (queryError.code === 9) {
          // FAILED_PRECONDITION
          console.warn(
            "Composite index not found for donor donations, falling back to unordered query"
          );
          const snapshot = await db
            .collection("donations")
            .where("donorId", "==", userId)
            .get();

          // Sort manually in memory
          const donationsArray = [];
          snapshot.forEach((doc) => {
            donationsArray.push({
              id: doc.id,
              ...doc.data(),
            });
          });

          // Sort by createdAt manually
          donationsArray.sort((a, b) => {
            const dateA = a.createdAt
              ? new Date(a.createdAt._seconds * 1000)
              : new Date(0);
            const dateB = b.createdAt
              ? new Date(b.createdAt._seconds * 1000)
              : new Date(0);
            return dateB - dateA;
          });

          donations = donationsArray;
        } else {
          // Re-throw if it's a different error
          throw queryError;
        }
      }
    } else if (userType === "ngo") {
      // For NGOs, get donations by matchedNgoId
      console.log("Fetching donations for NGO:", userId);
      // Using a try-catch block to handle the case where the composite index doesn't exist
      try {
        const snapshot = await db
          .collection("donations")
          .where("matchedNgoId", "==", userId)
          .orderBy("createdAt", "desc")
          .get();

        snapshot.forEach((doc) => {
          donations.push({
            id: doc.id,
            ...doc.data(),
          });
        });
      } catch (queryError) {
        console.error("NGO donation history query error:", queryError);
        // If the composite index doesn't exist, fall back to a query without ordering
        if (queryError.code === 9) {
          // FAILED_PRECONDITION
          console.warn(
            "Composite index not found, falling back to unordered query"
          );
          const snapshot = await db
            .collection("donations")
            .where("matchedNgoId", "==", userId)
            .get();

          // Sort manually in memory
          const donationsArray = [];
          snapshot.forEach((doc) => {
            donationsArray.push({
              id: doc.id,
              ...doc.data(),
            });
          });

          // Sort by createdAt manually
          donationsArray.sort((a, b) => {
            const dateA = a.createdAt
              ? new Date(a.createdAt._seconds * 1000)
              : new Date(0);
            const dateB = b.createdAt
              ? new Date(b.createdAt._seconds * 1000)
              : new Date(0);
            return dateB - dateA;
          });

          donations = donationsArray;
        } else {
          // Re-throw if it's a different error
          throw queryError;
        }
      }
    } else {
      return res.status(403).json({
        success: false,
        message: "Invalid user type",
      });
    }

    console.log("Returning donations:", donations.length);
    res.json({
      success: true,
      donations,
    });
  } catch (error) {
    console.error("Get donation history error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get donation history",
      error: error.message,
    });
  }
});

// Get single donation by ID
// IMPORTANT: This must come AFTER /history route to avoid conflicts
router.get("/:donationId", authenticateToken, async (req, res) => {
  try {
    const { donationId } = req.params;
    const userId = req.user.uid;

    console.log("Fetching donation:", { donationId, userId });

    // Get donation document
    const donationDoc = await db.collection("donations").doc(donationId).get();

    if (!donationDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Donation not found",
      });
    }

    const donation = {
      id: donationDoc.id,
      ...donationDoc.data(),
    };

    // Check if user has access to this donation
    // Donors can see their own donations, NGOs can see donations they matched
    if (
      req.user.userType === "donor" &&
      donation.donorId !== userId
    ) {
      return res.status(403).json({
        success: false,
        message: "You don't have access to this donation",
      });
    }

    if (
      req.user.userType === "ngo" &&
      donation.matchedNgoId !== userId
    ) {
      return res.status(403).json({
        success: false,
        message: "You don't have access to this donation",
      });
    }

    res.json(donation);
  } catch (error) {
    console.error("Get donation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get donation",
      error: error.message,
    });
  }
});

module.exports = router;
