const express = require('express');
const jwt = require('jsonwebtoken');
const { db } = require('../config/firebase');
const { getDistance } = require('geolib');

const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No token provided'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// List a new donation
router.post('/list', authenticateToken, async (req, res) => {
  try {
    const { itemType, quantity, description, pickupAddress, coordinates } = req.body;
    const donorId = req.user.uid;

    // Get donor details
    const donorDoc = await db.collection('users').doc(donorId).get();
    const donorData = donorDoc.data();

    // Create donation document
    const donationData = {
      donorId,
      donorName: donorData.name,
      donorPhone: donorData.phone,
      itemType,
      quantity,
      description,
      pickupAddress,
      coordinates,
      status: 'available',
      createdAt: new Date(),
      matchedNgoId: null,
      completedAt: null
    };

    const donationRef = await db.collection('donations').add(donationData);
    const donationId = donationRef.id;

    // Find nearby NGOs (within 15km radius)
    const ngosSnapshot = await db.collection('users')
      .where('userType', '==', 'ngo')
      .where('status', '==', 'verified')
      .get();

    const nearbyNgos = [];
    const maxDistance = 15000; // 15km in meters

    ngosSnapshot.forEach(doc => {
      const ngoData = doc.data();
      if (ngoData.coordinates) {
        const distance = getDistance(
          { latitude: coordinates.lat, longitude: coordinates.lng },
          { latitude: ngoData.coordinates.lat, longitude: ngoData.coordinates.lng }
        );

        if (distance <= maxDistance) {
          nearbyNgos.push({
            ngoId: doc.id,
            ngoName: ngoData.name,
            distance: distance / 1000 // Convert to km
          });
        }
      }
    });

    // Send real-time notifications to nearby NGOs
    const io = req.app.get('io');
    nearbyNgos.forEach(ngo => {
      io.to(`ngo-${ngo.ngoId}`).emit('new-donation', {
        donationId,
        ...donationData,
        distance: ngo.distance
      });
    });

    res.status(201).json({
      success: true,
      donationId,
      nearbyNgos: nearbyNgos.length,
      message: 'Donation listed successfully'
    });
  } catch (error) {
    console.error('List donation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list donation',
      error: error.message
    });
  }
});

// Get available donations for NGOs
router.get('/available', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'ngo') {
      return res.status(403).json({
        success: false,
        message: 'Only NGOs can access available donations'
      });
    }

    const ngoId = req.user.uid;
    const ngoDoc = await db.collection('users').doc(ngoId).get();
    const ngoData = ngoDoc.data();

    if (!ngoData.coordinates) {
      return res.json({
        success: true,
        donations: []
      });
    }

    // Get all available donations
    const donationsSnapshot = await db.collection('donations')
      .where('status', '==', 'available')
      .get();

    const availableDonations = [];
    const maxDistance = 15000; // 15km

    donationsSnapshot.forEach(doc => {
      const donationData = doc.data();
      if (donationData.coordinates) {
        const distance = getDistance(
          { latitude: ngoData.coordinates.lat, longitude: ngoData.coordinates.lng },
          { latitude: donationData.coordinates.lat, longitude: donationData.coordinates.lng }
        );

        if (distance <= maxDistance) {
          availableDonations.push({
            id: doc.id,
            ...donationData,
            distance: distance / 1000 // Convert to km
          });
        }
      }
    });

    // Sort by distance
    availableDonations.sort((a, b) => a.distance - b.distance);

    res.json({
      success: true,
      donations: availableDonations
    });
  } catch (error) {
    console.error('Get available donations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get available donations',
      error: error.message
    });
  }
});

// Accept a donation (NGO action)
router.post('/:donationId/accept', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'ngo') {
      return res.status(403).json({
        success: false,
        message: 'Only NGOs can accept donations'
      });
    }

    const { donationId } = req.params;
    const ngoId = req.user.uid;

    // Check if donation is still available
    const donationRef = db.collection('donations').doc(donationId);
    const donationDoc = await donationRef.get();

    if (!donationDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found'
      });
    }

    const donationData = donationDoc.data();

    if (donationData.status !== 'available') {
      return res.status(400).json({
        success: false,
        message: 'Donation is no longer available'
      });
    }

    // Update donation status
    await donationRef.update({
      status: 'matched',
      matchedNgoId: ngoId,
      matchedAt: new Date()
    });

    // Get NGO details
    const ngoDoc = await db.collection('users').doc(ngoId).get();
    const ngoData = ngoDoc.data();

    // Notify donor
    const io = req.app.get('io');
    io.to(`donor-${donationData.donorId}`).emit('donation-accepted', {
      donationId,
      ngoName: ngoData.name,
      ngoPhone: ngoData.phone,
      ngoAddress: ngoData.address
    });

    res.json({
      success: true,
      message: 'Donation accepted successfully'
    });
  } catch (error) {
    console.error('Accept donation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept donation',
      error: error.message
    });
  }
});

// Complete a donation
router.post('/:donationId/complete', authenticateToken, async (req, res) => {
  try {
    const { donationId } = req.params;
    const ngoId = req.user.uid;

    const donationRef = db.collection('donations').doc(donationId);
    const donationDoc = await donationRef.get();

    if (!donationDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found'
      });
    }

    const donationData = donationDoc.data();

    if (donationData.matchedNgoId !== ngoId) {
      return res.status(403).json({
        success: false,
        message: 'Only the matched NGO can complete this donation'
      });
    }

    // Update donation status
    await donationRef.update({
      status: 'completed',
      completedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Donation completed successfully'
    });
  } catch (error) {
    console.error('Complete donation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete donation',
      error: error.message
    });
  }
});

// Get donor's donation history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const userType = req.user.userType;

    let query;
    if (userType === 'donor') {
      query = db.collection('donations').where('donorId', '==', userId);
    } else if (userType === 'ngo') {
      query = db.collection('donations').where('matchedNgoId', '==', userId);
    } else {
      return res.status(403).json({
        success: false,
        message: 'Invalid user type'
      });
    }

    const snapshot = await query.orderBy('createdAt', 'desc').get();
    const donations = [];

    snapshot.forEach(doc => {
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
    console.error('Get donation history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get donation history',
      error: error.message
    });
  }
});

module.exports = router; 