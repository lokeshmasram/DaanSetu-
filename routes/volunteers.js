const express = require('express');
const jwt = require('jsonwebtoken');
const { db } = require('../config/firebase');

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

// Volunteer registration
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, phone, address, skills, availability } = req.body;

    // Create volunteer user document
    const volunteerData = {
      email,
      name,
      phone,
      address,
      skills: skills || [],
      availability: availability || 'flexible',
      userType: 'volunteer',
      status: 'active',
      createdAt: new Date()
    };

    // Store in Firestore (user will be created in auth route)
    const volunteerRef = await db.collection('volunteers').add(volunteerData);

    res.status(201).json({
      success: true,
      volunteerId: volunteerRef.id,
      message: 'Volunteer registration successful'
    });
  } catch (error) {
    console.error('Volunteer registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register volunteer',
      error: error.message
    });
  }
});

// Get available volunteer tasks
router.get('/tasks', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'volunteer') {
      return res.status(403).json({
        success: false,
        message: 'Only volunteers can access tasks'
      });
    }

    const tasksSnapshot = await db.collection('volunteer_tasks')
      .where('status', '==', 'available')
      .get();

    const tasks = [];
    tasksSnapshot.forEach(doc => {
      tasks.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json({
      success: true,
      tasks
    });
  } catch (error) {
    console.error('Get volunteer tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get volunteer tasks',
      error: error.message
    });
  }
});

// Accept a volunteer task
router.post('/tasks/:taskId/accept', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'volunteer') {
      return res.status(403).json({
        success: false,
        message: 'Only volunteers can accept tasks'
      });
    }

    const { taskId } = req.params;
    const volunteerId = req.user.uid;

    // Check if task is still available
    const taskRef = db.collection('volunteer_tasks').doc(taskId);
    const taskDoc = await taskRef.get();

    if (!taskDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const taskData = taskDoc.data();

    if (taskData.status !== 'available') {
      return res.status(400).json({
        success: false,
        message: 'Task is no longer available'
      });
    }

    // Update task status
    await taskRef.update({
      status: 'assigned',
      assignedVolunteerId: volunteerId,
      assignedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Task accepted successfully'
    });
  } catch (error) {
    console.error('Accept task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept task',
      error: error.message
    });
  }
});

// Complete a volunteer task
router.post('/tasks/:taskId/complete', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'volunteer') {
      return res.status(403).json({
        success: false,
        message: 'Only volunteers can complete tasks'
      });
    }

    const { taskId } = req.params;
    const volunteerId = req.user.uid;

    const taskRef = db.collection('volunteer_tasks').doc(taskId);
    const taskDoc = await taskRef.get();

    if (!taskDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const taskData = taskDoc.data();

    if (taskData.assignedVolunteerId !== volunteerId) {
      return res.status(403).json({
        success: false,
        message: 'Only the assigned volunteer can complete this task'
      });
    }

    // Update task status
    await taskRef.update({
      status: 'completed',
      completedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Task completed successfully'
    });
  } catch (error) {
    console.error('Complete task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete task',
      error: error.message
    });
  }
});

// Get volunteer's task history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'volunteer') {
      return res.status(403).json({
        success: false,
        message: 'Only volunteers can access task history'
      });
    }

    const volunteerId = req.user.uid;

    const tasksSnapshot = await db.collection('volunteer_tasks')
      .where('assignedVolunteerId', '==', volunteerId)
      .orderBy('assignedAt', 'desc')
      .get();

    const tasks = [];
    tasksSnapshot.forEach(doc => {
      tasks.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json({
      success: true,
      tasks
    });
  } catch (error) {
    console.error('Get volunteer history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get volunteer history',
      error: error.message
    });
  }
});

// Create volunteer task (for NGOs)
router.post('/create-task', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'ngo') {
      return res.status(403).json({
        success: false,
        message: 'Only NGOs can create volunteer tasks'
      });
    }

    const { title, description, location, requiredSkills, estimatedDuration } = req.body;
    const ngoId = req.user.uid;

    // Get NGO details
    const ngoDoc = await db.collection('users').doc(ngoId).get();
    const ngoData = ngoDoc.data();

    const taskData = {
      ngoId,
      ngoName: ngoData.name,
      title,
      description,
      location,
      requiredSkills: requiredSkills || [],
      estimatedDuration,
      status: 'available',
      createdAt: new Date(),
      assignedVolunteerId: null,
      assignedAt: null,
      completedAt: null
    };

    const taskRef = await db.collection('volunteer_tasks').add(taskData);

    res.status(201).json({
      success: true,
      taskId: taskRef.id,
      message: 'Volunteer task created successfully'
    });
  } catch (error) {
    console.error('Create volunteer task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create volunteer task',
      error: error.message
    });
  }
});

module.exports = router; 