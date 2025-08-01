const express = require('express');
const jwt = require('jsonwebtoken');
const { db } = require('../config/firebase');

const router = express.Router();

// Middleware to verify JWT token and admin role
const authenticateAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No token provided'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Check if user is admin
    const userDoc = await db.collection('users').doc(decoded.uid).get();
    const userData = userDoc.data();

    if (userData.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// Get all pending NGO verifications
router.get('/pending-ngos', authenticateAdmin, async (req, res) => {
  try {
    const pendingSnapshot = await db.collection('pending_ngos').get();

    const pendingNgos = [];
    pendingSnapshot.forEach(doc => {
      pendingNgos.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json({
      success: true,
      pendingNgos
    });
  } catch (error) {
    console.error('Get pending NGOs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pending NGOs',
      error: error.message
    });
  }
});

// Verify or reject NGO
router.post('/verify-ngo/:ngoId', authenticateAdmin, async (req, res) => {
  try {
    const { ngoId } = req.params;
    const { status, adminNotes } = req.body;

    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be "verified" or "rejected"'
      });
    }

    // Get pending NGO data
    const pendingNgoDoc = await db.collection('pending_ngos').doc(ngoId).get();
    
    if (!pendingNgoDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Pending NGO not found'
      });
    }

    const pendingNgoData = pendingNgoDoc.data();

    if (status === 'verified') {
      // Move to verified users collection
      await db.collection('users').doc(ngoId).set({
        ...pendingNgoData,
        status: 'verified',
        verifiedAt: new Date(),
        verifiedBy: req.user.uid,
        adminNotes
      });

      // Delete from pending collection
      await db.collection('pending_ngos').doc(ngoId).delete();
    } else if (status === 'rejected') {
      // Update status in pending collection
      await db.collection('pending_ngos').doc(ngoId).update({
        status: 'rejected',
        rejectedAt: new Date(),
        rejectedBy: req.user.uid,
        adminNotes
      });
    }

    res.json({
      success: true,
      message: `NGO ${status} successfully`
    });
  } catch (error) {
    console.error('Verify NGO error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify NGO',
      error: error.message
    });
  }
});

// Get platform statistics
router.get('/statistics', authenticateAdmin, async (req, res) => {
  try {
    // Get total users
    const usersSnapshot = await db.collection('users').get();
    const totalUsers = usersSnapshot.size;

    // Get total NGOs
    const ngosSnapshot = await db.collection('users')
      .where('userType', '==', 'ngo')
      .get();
    const totalNgos = ngosSnapshot.size;

    // Get verified NGOs
    const verifiedNgosSnapshot = await db.collection('users')
      .where('userType', '==', 'ngo')
      .where('status', '==', 'verified')
      .get();
    const verifiedNgos = verifiedNgosSnapshot.size;

    // Get total donations
    const donationsSnapshot = await db.collection('donations').get();
    const totalDonations = donationsSnapshot.size;

    // Get completed donations
    const completedDonationsSnapshot = await db.collection('donations')
      .where('status', '==', 'completed')
      .get();
    const completedDonations = completedDonationsSnapshot.size;

    // Get pending verifications
    const pendingSnapshot = await db.collection('pending_ngos').get();
    const pendingVerifications = pendingSnapshot.size;

    res.json({
      success: true,
      statistics: {
        totalUsers,
        totalNgos,
        verifiedNgos,
        totalDonations,
        completedDonations,
        pendingVerifications
      }
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get statistics',
      error: error.message
    });
  }
});

// Get all donations for admin view
router.get('/donations', authenticateAdmin, async (req, res) => {
  try {
    const donationsSnapshot = await db.collection('donations')
      .orderBy('createdAt', 'desc')
      .get();

    const donations = [];
    donationsSnapshot.forEach(doc => {
      donations.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json({
      success: true,
      donations
    });
  } catch (error) {
    console.error('Get donations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get donations',
      error: error.message
    });
  }
});

module.exports = router; 