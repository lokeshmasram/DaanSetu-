const express = require('express');
const jwt = require('jsonwebtoken');
const { db, storage } = require('../config/firebase');
const multer = require('multer');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

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

// NGO registration with document upload
router.post('/register', upload.array('documents', 5), async (req, res) => {
  try {
    const { email, password, name, phone, address, registrationId, coordinates } = req.body;
    const files = req.files;

    // Upload verification documents to Firebase Storage
    const documentUrls = [];
    if (files && files.length > 0) {
      for (const file of files) {
        const fileName = `ngo-documents/${Date.now()}-${file.originalname}`;
        const fileUpload = storage.bucket().file(fileName);
        
        await fileUpload.save(file.buffer, {
          metadata: {
            contentType: file.mimetype
          }
        });

        const [url] = await fileUpload.getSignedUrl({
          action: 'read',
          expires: '03-01-2500'
        });

        documentUrls.push(url);
      }
    }

    // Create NGO user document
    const ngoData = {
      email,
      name,
      phone,
      address,
      registrationId,
      coordinates: coordinates ? JSON.parse(coordinates) : null,
      verificationDocuments: documentUrls,
      userType: 'ngo',
      status: 'pending_verification',
      createdAt: new Date()
    };

    // Store in Firestore (user will be created in auth route)
    const ngoRef = await db.collection('pending_ngos').add(ngoData);

    res.status(201).json({
      success: true,
      ngoId: ngoRef.id,
      message: 'NGO registration submitted successfully. Awaiting verification.'
    });
  } catch (error) {
    console.error('NGO registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register NGO',
      error: error.message
    });
  }
});

// Get NGO verification status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'ngo') {
      return res.status(403).json({
        success: false,
        message: 'Only NGOs can access this endpoint'
      });
    }

    const ngoDoc = await db.collection('users').doc(req.user.uid).get();
    
    if (!ngoDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'NGO not found'
      });
    }

    const ngoData = ngoDoc.data();

    res.json({
      success: true,
      status: ngoData.status,
      ngo: {
        name: ngoData.name,
        email: ngoData.email,
        phone: ngoData.phone,
        address: ngoData.address,
        registrationId: ngoData.registrationId,
        verificationDocuments: ngoData.verificationDocuments || []
      }
    });
  } catch (error) {
    console.error('Get NGO status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get NGO status',
      error: error.message
    });
  }
});

// Update NGO coordinates
router.put('/coordinates', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'ngo') {
      return res.status(403).json({
        success: false,
        message: 'Only NGOs can update coordinates'
      });
    }

    const { coordinates } = req.body;

    await db.collection('users').doc(req.user.uid).update({
      coordinates,
      updatedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Coordinates updated successfully'
    });
  } catch (error) {
    console.error('Update coordinates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update coordinates',
      error: error.message
    });
  }
});

module.exports = router; 