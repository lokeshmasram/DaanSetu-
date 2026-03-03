const express = require("express");
const jwt = require("jsonwebtoken");
const { db } = require("../config/firebase");

const router = express.Router();

// Middleware to verify JWT token and admin role
const authenticateAdmin = async (req, res, next) => {
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

    // Handle static admin user
    if (decoded.uid === "admin" && decoded.userType === "admin") {
      req.user = decoded;
      return next();
    }

    // Check if database user is admin
    const userDoc = await db.collection("users").doc(decoded.uid).get();
    const userData = userDoc.data();

    if (!userData || userData.userType !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: "Invalid token",
    });
  }
};

// Get all pending NGO verifications
router.get("/pending-ngos", authenticateAdmin, async (req, res) => {
  try {
    // First get pending NGOs from pending_ngos collection
    const pendingSnapshot = await db.collection("pending_ngos").get();

    const pendingNgos = [];
    const pendingNgoIds = new Set();

    pendingSnapshot.forEach((doc) => {
      pendingNgos.push({
        id: doc.id,
        ...doc.data(),
      });
      pendingNgoIds.add(doc.id);
    });

    // Also get NGOs with pending verification status from users collection
    // but avoid duplicates by checking if they're already in pending_ngos
    const pendingUsersSnapshot = await db
      .collection("users")
      .where("userType", "==", "ngo")
      .where("status", "==", "pending_verification")
      .get();

    pendingUsersSnapshot.forEach((doc) => {
      // Only add if not already in pending_ngos collection
      if (!pendingNgoIds.has(doc.id)) {
        pendingNgos.push({
          id: doc.id,
          ...doc.data(),
        });
      }
    });

    res.json({
      success: true,
      pendingNgos,
    });
  } catch (error) {
    console.error("Get pending NGOs error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get pending NGOs",
      error: error.message,
    });
  }
});

// Get single pending NGO details
router.get('/pending-ngos/:ngoId', authenticateAdmin, async (req, res) => {
  try {
    const { ngoId } = req.params;

    // Try pending_ngos collection first
    const pendingDoc = await db.collection('pending_ngos').doc(ngoId).get();
    if (pendingDoc.exists) {
      return res.json({ success: true, ...pendingDoc.data() });
    }

    // Fallback to users collection if not in pending
    const userDoc = await db.collection('users').doc(ngoId).get();
    if (userDoc.exists && userDoc.data().userType === 'ngo') {
      return res.json({ success: true, ...userDoc.data() });
    }

    return res.status(404).json({ success: false, message: 'Pending NGO not found' });
  } catch (error) {
    console.error('Get pending NGO details error:', error);
    res.status(500).json({ success: false, message: 'Failed to get pending NGO details', error: error.message });
  }
});

// Verify or reject NGO
router.post("/verify-ngo/:ngoId", authenticateAdmin, async (req, res) => {
  try {
    const { ngoId } = req.params;
    const { status, adminNotes } = req.body;

    console.log(`Incoming verify-ngo request - ngoId=${ngoId}, status=${status}`);
    console.log('Admin executing verify-ngo:', req.user ? req.user.uid : 'unknown');

    if (!["verified", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be "verified" or "rejected"',
      });
    }

    let pendingNgoData = null;
    let isFromPendingCollection = true;

    // First try to get from pending_ngos collection
    const pendingNgoDoc = await db.collection("pending_ngos").doc(ngoId).get();

    if (pendingNgoDoc.exists) {
      pendingNgoData = pendingNgoDoc.data();
    } else {
      // If not found in pending_ngos, try to get from users collection
      const userNgoDoc = await db.collection("users").doc(ngoId).get();
      if (
        userNgoDoc.exists &&
        userNgoDoc.data().userType === "ngo" &&
        (userNgoDoc.data().status === "pending_verification" || userNgoDoc.data().status === "rejected")
      ) {
        pendingNgoData = userNgoDoc.data();
        isFromPendingCollection = false;
      } else {
        return res.status(404).json({
          success: false,
          message: "Pending NGO not found",
        });
      }
    }

    let activityRef = null;

    if (status === "verified") {
      // Update users collection to verified
      await db.collection('users').doc(ngoId).update({
        status: 'verified',
        verifiedAt: new Date(),
        verifiedBy: req.user ? req.user.uid : 'admin',
        adminNotes: adminNotes || ''
      });

      if (isFromPendingCollection) {
        try { await db.collection('pending_ngos').doc(ngoId).delete(); } catch (e) { console.warn('Could not delete pending_ngos doc', e.message); }
      }

      // notify NGO
      const io = req.app.get('io');
      if (io) {
        io.to(`ngo-${ngoId}`).emit('ngo-verified', { 
          status: 'verified', 
          message: 'Your NGO has been verified by the admin!'
        });
        console.log(`Sent ngo-verified notification to ngo-${ngoId}`);
      }

    } else if (status === "rejected") {
      // Update status in appropriate collection instead of deleting
      const updateData = {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectedBy: req.user ? req.user.uid : 'admin',
        adminNotes: adminNotes || ''
      };

      if (isFromPendingCollection) {
        // Delete from pending_ngos collection since verification is complete
        await db.collection('pending_ngos').doc(ngoId).delete();
        // Also update the user document with rejected status
        await db.collection('users').doc(ngoId).update(updateData);
      } else {
        // Update the user document with rejected status
        await db.collection('users').doc(ngoId).update(updateData);
      }

      // Record admin activity
      try {
        const activity = {
          type: 'ngo_rejected',
          title: 'NGO Verification Rejected',
          description: `${pendingNgoData.name || 'NGO'} (NGO) verification was rejected`,
          details: adminNotes || '',
          icon: 'fa-times-circle',
          color: '#ff6b6b',
          timestamp: new Date(),
          relatedId: ngoId
        };

        activityRef = await db.collection('admin_activities').add(activity);
        console.log(`Admin activity recorded for NGO ${ngoId}, activityId=${activityRef.id}`);

        const io = req.app.get('io');
        if (io) {
          io.to(`ngo-${ngoId}`).emit('ngo-rejected', {
            status: 'rejected',
            message: `Your (${pendingNgoData.name || 'NGO'}) verification request has been denied due to the reason:`,
            reasons: adminNotes || ''
          });

          // notify admin dashboards to refresh activities
          io.emit('platform-activity', { action: 'new_activity', activity: { id: activityRef.id, ...activity } });
          console.log(`Sent ngo-rejected notification to ngo-${ngoId}`);
        }
      } catch (actErr) {
        console.warn('Could not record admin activity:', actErr.message);
      }
    }

    return res.json({ 
      success: true, 
      message: `NGO ${status} successfully`, 
      activityId: activityRef ? activityRef.id : null, 
      adminNotes: adminNotes || '' 
    });

  } catch (error) {
    console.error('Verify NGO error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to verify NGO', 
      error: error.message, 
      stack: error.stack 
    });
  }
});

// Get platform statistics
router.get("/statistics", authenticateAdmin, async (req, res) => {
  try {
    // Get total users
    const usersSnapshot = await db.collection("users").get();
    const totalUsers = usersSnapshot.size;

    // Get total donors
    const donorsSnapshot = await db
      .collection("users")
      .where("userType", "==", "donor")
      .get();
    const totalDonors = donorsSnapshot.size;

    // Get total volunteers
    const volunteersSnapshot = await db
      .collection("users")
      .where("userType", "==", "volunteer")
      .get();
    const totalVolunteers = volunteersSnapshot.size;

    // Get total NGOs
    const ngosSnapshot = await db
      .collection("users")
      .where("userType", "==", "ngo")
      .get();
    const totalNgos = ngosSnapshot.size;

    // Get verified NGOs
    const verifiedNgosSnapshot = await db
      .collection("users")
      .where("userType", "==", "ngo")
      .where("status", "==", "verified")
      .get();
    const verifiedNgos = verifiedNgosSnapshot.size;

    // Get total donations
    const donationsSnapshot = await db.collection("donations").get();
    const totalDonations = donationsSnapshot.size;

    // Get completed donations
    const completedDonationsSnapshot = await db
      .collection("donations")
      .where("status", "==", "completed")
      .get();
    const completedDonations = completedDonationsSnapshot.size;

    // Get pending verifications from pending_ngos collection
    const pendingSnapshot = await db.collection("pending_ngos").get();
    let pendingVerifications = pendingSnapshot.size;

    // Also count NGOs with pending verification status from users collection
    // but avoid double counting by excluding those already in pending_ngos
    const pendingUsersSnapshot = await db
      .collection("users")
      .where("userType", "==", "ngo")
      .where("status", "==", "pending_verification")
      .get();

    // We need to check if these users are also in pending_ngos to avoid double counting
    for (const doc of pendingUsersSnapshot.docs) {
      const pendingDoc = await db.collection("pending_ngos").doc(doc.id).get();
      if (!pendingDoc.exists) {
        // Only count if not in pending_ngos
        pendingVerifications++;
      }
    }

    res.json({
      success: true,
      statistics: {
        totalUsers,
        totalDonors,
        totalVolunteers,
        totalNgos,
        verifiedNgos,
        totalDonations,
        completedDonations,
        pendingVerifications,
      },
    });
  } catch (error) {
    console.error("Get statistics error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get statistics",
      error: error.message,
    });
  }
});

// Get all users (with optional type filter)
router.get("/users", authenticateAdmin, async (req, res) => {
  try {
    const { type } = req.query;
    
    let usersQuery = db.collection("users");
    
    // Filter by user type if specified
    if (type && type !== 'all') {
      usersQuery = usersQuery.where("userType", "==", type);
    }
    
    const usersSnapshot = await usersQuery.get();
    const users = [];
    
    usersSnapshot.forEach((doc) => {
      users.push({
        uid: doc.id,
        ...doc.data(),
      });
    });
    
    // Sort by creation date (newest first)
    users.sort((a, b) => {
      const dateA = a.createdAt?._seconds || a.createdAt?.seconds || 0;
      const dateB = b.createdAt?._seconds || b.createdAt?.seconds || 0;
      return dateB - dateA;
    });
    
    res.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get users",
      error: error.message,
    });
  }
});

// Get all donations for admin view
router.get("/donations", authenticateAdmin, async (req, res) => {
  try {
    console.log("Fetching all donations for admin...");
    
    // Get all donations without ordering (to avoid index issues)
    const donationsSnapshot = await db.collection("donations").get();

    const donations = [];
    donationsSnapshot.forEach((doc) => {
      const donationData = doc.data();
      donations.push({
        id: doc.id,
        ...donationData,
        // Ensure we have donor and NGO names
        donorName: donationData.donorName || donationData.donorId || 'Unknown',
        ngoName: donationData.ngoName || donationData.matchedNgoId || '-',
      });
    });

    // Sort by creation date on server side
    donations.sort((a, b) => {
      const dateA = a.createdAt?._seconds || a.createdAt?.seconds || 0;
      const dateB = b.createdAt?._seconds || b.createdAt?.seconds || 0;
      return dateB - dateA;
    });

    console.log(`Returning ${donations.length} donations`);

    res.json({
      success: true,
      donations,
    });
  } catch (error) {
    console.error("Get donations error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get donations",
      error: error.message,
    });
  }
});

// Get platform activities (recent completed actions)
router.get("/activities", authenticateAdmin, async (req, res) => {
  try {
    console.log("Fetching platform activities...");
    
    const activities = [];
    
    // Get recent donations (all statuses)
    const donationsSnapshot = await db.collection("donations").get();
    donationsSnapshot.forEach((doc) => {
      const donation = doc.data();
      
      // Add donation creation activity
      activities.push({
        id: `donation-created-${doc.id}`,
        type: 'donation_created',
        icon: 'fa-gift',
        color: '#667eea',
        title: 'New Donation',
        description: `${donation.donorName || 'A donor'} (Donor) listed ${donation.itemType}`,
        timestamp: donation.createdAt,
        relatedId: doc.id
      });
      
      // Add donation matched activity
      if (donation.status === 'accepted' || donation.status === 'completed') {
        activities.push({
          id: `donation-matched-${doc.id}`,
          type: 'donation_matched',
          icon: 'fa-handshake',
          color: '#00b894',
          title: 'Donation Accepted',
          description: `${donation.ngoName || 'An NGO'} (NGO) accepted ${donation.itemType}`,
          timestamp: donation.acceptedAt || donation.createdAt,
          relatedId: doc.id
        });
      }
      
      // Add donation completed activity
      if (donation.status === 'completed') {
        activities.push({
          id: `donation-completed-${doc.id}`,
          type: 'donation_completed',
          icon: 'fa-check-circle',
          color: '#00b894',
          title: 'Donation Completed',
          description: `${donation.itemType} successfully delivered to ${donation.ngoName || 'NGO'} (NGO)`,
          timestamp: donation.completedAt || donation.createdAt,
          relatedId: doc.id
        });
      }
      
      // Add donation cancelled activity
      if (donation.status === 'cancelled') {
        activities.push({
          id: `donation-cancelled-${doc.id}`,
          type: 'donation_cancelled',
          icon: 'fa-times-circle',
          color: '#ff6b6b',
          title: 'Donation Cancelled',
          description: `${donation.donorName || 'A donor'} (Donor) cancelled ${donation.itemType} donation`,
          timestamp: donation.cancelledAt || donation.updatedAt || donation.createdAt,
          relatedId: doc.id
        });
      }
    });
    
    // Get recent user registrations
    const usersSnapshot = await db.collection("users").get();
    usersSnapshot.forEach((doc) => {
      const user = doc.data();
      
      if (user.userType === 'donor') {
        activities.push({
          id: `user-registered-${doc.id}`,
          type: 'user_registered',
          icon: 'fa-user-plus',
          color: '#667eea',
          title: 'New Donor Registered',
          description: `${user.name} (Donor) joined the platform`,
          timestamp: user.createdAt,
          relatedId: doc.id
        });
      } else if (user.userType === 'volunteer') {
        activities.push({
          id: `volunteer-registered-${doc.id}`,
          type: 'volunteer_registered',
          icon: 'fa-hands-helping',
          color: '#ffd93d',
          title: 'New Volunteer Registered',
          description: `${user.name} (Volunteer) joined the platform`,
          timestamp: user.createdAt,
          relatedId: doc.id
        });
      }
    });
    
    // Get NGO verifications
    const ngosSnapshot = await db.collection("users").where("userType", "==", "ngo").get();
    ngosSnapshot.forEach((doc) => {
      const ngo = doc.data();
      
      if (ngo.status === 'verified' && ngo.verifiedAt) {
        activities.push({
          id: `ngo-verified-${doc.id}`,
          type: 'ngo_verified',
          icon: 'fa-certificate',
          color: '#00b894',
          title: 'NGO Verified',
          description: `${ngo.name} (NGO) has been verified`,
          timestamp: ngo.verifiedAt,
          relatedId: doc.id
        });
      }
    });

    // Get volunteer tasks activities
    const volunteerTasksSnapshot = await db.collection("volunteer_tasks").get();
    
    // Create activities using stored volunteer names
    volunteerTasksSnapshot.forEach((doc) => {
      const task = doc.data();
      
      // Add task creation activity
      activities.push({
        id: `task-created-${doc.id}`,
        type: 'task_created',
        icon: 'fa-tasks',
        color: '#667eea',
        title: 'Volunteer Task Created',
        description: `${task.ngoName || 'An NGO'} (NGO) created task: ${task.title}`,
        timestamp: task.createdAt,
        relatedId: doc.id
      });
      
      // Add task assigned activity
      if (task.status === 'assigned' || task.status === 'completed') {
        const volunteerName = task.assignedVolunteerName || 'A volunteer';
        activities.push({
          id: `task-assigned-${doc.id}`,
          type: 'task_assigned',
          icon: 'fa-user-check',
          color: '#ffd93d',
          title: 'Task Assigned',
          description: `${volunteerName} (Volunteer) accepted task: ${task.title}`,
          timestamp: task.assignedAt || task.createdAt,
          relatedId: doc.id
        });
      }
      
      // Add task completed activity
      if (task.status === 'completed') {
        const volunteerName = task.assignedVolunteerName || 'A volunteer';
        activities.push({
          id: `task-completed-${doc.id}`,
          type: 'task_completed',
          icon: 'fa-check-circle',
          color: '#00b894',
          title: 'Task Completed',
          description: `${volunteerName} (Volunteer) completed task: ${task.title}`,
          timestamp: task.completedAt || task.createdAt,
          relatedId: doc.id
        });
      }
      
      // Add task cancelled activity
      if (task.status === 'cancelled') {
        activities.push({
          id: `task-cancelled-${doc.id}`,
          type: 'task_cancelled',
          icon: 'fa-times-circle',
          color: '#ff6b6b',
          title: 'Task Cancelled',
          description: `${task.ngoName || 'NGO'} (NGO) cancelled task: ${task.title}`,
          timestamp: task.cancelledAt || task.createdAt,
          relatedId: doc.id
        });
      }
    });

    // Include admin-created activities (like rejections)
    try {
      const adminActivitiesSnapshot = await db.collection('admin_activities').get();
      adminActivitiesSnapshot.forEach((doc) => {
        const a = doc.data();
        activities.push({
          id: `admin-activity-${doc.id}`,
          type: a.type || 'admin_activity',
          icon: a.icon || 'fa-info-circle',
          color: a.color || '#667eea',
          title: a.title || 'Admin Activity',
          description: a.description || '',
          details: a.details || '',
          timestamp: a.timestamp || new Date(),
          relatedId: a.relatedId || null
        });
      });
    } catch (aaErr) {
      console.warn('Could not load admin_activities:', aaErr.message);
    }
    
    // Sort activities by timestamp (newest first)
    activities.sort((a, b) => {
      const timeA = a.timestamp?._seconds || a.timestamp?.seconds || 0;
      const timeB = b.timestamp?._seconds || b.timestamp?.seconds || 0;
      return timeB - timeA;
    });
    
    // Return only the 20 most recent activities
    const recentActivities = activities.slice(0, 20);
    
    console.log(`Returning ${recentActivities.length} activities`);
    
    res.json({
      success: true,
      activities: recentActivities,
    });
  } catch (error) {
    console.error("Get activities error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get activities",
      error: error.message,
    });
  }
});

// Debug endpoint to check NGO status in both collections
router.get("/debug/ngo-status/:ngoId", authenticateAdmin, async (req, res) => {
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
      message: "Failed to debug NGO status",
      error: error.message,
    });
  }
});

// Dev-only helper: create a pending NGO document (admin only)
router.post("/debug/create-pending-ngo", authenticateAdmin, async (req, res) => {
  try {
    const { id, data } = req.body;
    if (!id || !data) return res.status(400).json({ success: false, message: 'id and data required' });

    await db.collection('pending_ngos').doc(id).set({ ...data });
    return res.json({ success: true, message: 'pending NGO created', id });
  } catch (error) {
    console.error('Create pending NGO error:', error);
    res.status(500).json({ success: false, message: 'Failed to create pending NGO', error: error.message });
  }
});

module.exports = router;