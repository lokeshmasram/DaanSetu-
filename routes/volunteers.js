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
    console.log("🔐 Authenticated user:", {
      uid: decoded.uid,
      email: decoded.email,
      userType: decoded.userType
    });
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: "Invalid token",
    });
  }
};

// Volunteer registration
router.post("/register", async (req, res) => {
  try {
    const { email, password, name, phone, address, skills, availability } =
      req.body;

    // Create volunteer user document
    const volunteerData = {
      email,
      name,
      phone,
      address,
      skills: skills || [],
      availability: availability || "flexible",
      userType: "volunteer",
      status: "active",
      createdAt: new Date(),
    };

    // Store in Firestore (user will be created in auth route)
    const volunteerRef = await db.collection("volunteers").add(volunteerData);

    res.status(201).json({
      success: true,
      volunteerId: volunteerRef.id,
      message: "Volunteer registration successful",
    });
  } catch (error) {
    console.error("Volunteer registration error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to register volunteer",
      error: error.message,
    });
  }
});

// Get available volunteer tasks
router.get("/tasks", authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== "volunteer") {
      return res.status(403).json({
        success: false,
        message: "Only volunteers can access tasks",
      });
    }

    const volunteerId = req.user.uid;
    console.log("\n🔍 GET /tasks - Volunteer:", volunteerId);

    // Get available tasks (not assigned to anyone yet)
    const availableTasksSnapshot = await db
      .collection("volunteer_tasks")
      .where("status", "==", "available")
      .get();

    console.log("📋 Available tasks:", availableTasksSnapshot.size);

    // Get tasks assigned to this volunteer
    const myTasksSnapshot = await db
      .collection("volunteer_tasks")
      .where("assignedVolunteerId", "==", volunteerId)
      .get();

    console.log("📋 Tasks assigned to me:", myTasksSnapshot.size);

    const tasks = [];
    
    // Add available tasks
    availableTasksSnapshot.forEach((doc) => {
      tasks.push({
        id: doc.id,
        ...doc.data(),
      });
      console.log(`  ✅ Available: ${doc.id} - ${doc.data().title}`);
    });

    // Add tasks assigned to this volunteer (if not already in list)
    myTasksSnapshot.forEach((doc) => {
      if (!tasks.find(t => t.id === doc.id)) {
        tasks.push({
          id: doc.id,
          ...doc.data(),
        });
        console.log(`  ✅ Assigned to me: ${doc.id} - ${doc.data().title}`);
      }
    });

    console.log(`📦 Total tasks returned: ${tasks.length}\n`);

    res.json({
      success: true,
      tasks,
    });
  } catch (error) {
    console.error("❌ Get volunteer tasks error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get volunteer tasks",
      error: error.message,
    });
  }
});

// Get available volunteer tasks for NGOs
router.get("/tasks/ngo", authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== "ngo") {
      return res.status(403).json({
        success: false,
        message: "Only NGOs can access tasks",
      });
    }

    const ngoId = req.user.uid;

    // Get all tasks created by this NGO (not just available ones)
    const tasksSnapshot = await db
      .collection("volunteer_tasks")
      .where("ngoId", "==", ngoId)
      .get();

    const tasks = [];
    tasksSnapshot.forEach((doc) => {
      tasks.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    res.json({
      success: true,
      tasks,
    });
  } catch (error) {
    console.error("Get volunteer tasks for NGO error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get volunteer tasks",
      error: error.message,
    });
  }
});

// Get volunteer task by donation ID (must come BEFORE /:volunteerId route)
router.get("/donation-tasks/:donationId", authenticateToken, async (req, res) => {
  try {
    const { donationId } = req.params;

    const taskSnapshot = await db
      .collection("volunteer_tasks")
      .where("donationId", "==", donationId)
      .limit(1)
      .get();

    if (taskSnapshot.empty) {
      return res.status(404).json({
        success: false,
        message: "No volunteer task found for this donation"
      });
    }

    const taskDoc = taskSnapshot.docs[0];
    const task = {
      id: taskDoc.id,
      ...taskDoc.data()
    };

    res.json({
      success: true,
      task
    });
  } catch (error) {
    console.error("Get donation volunteer task error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get volunteer task",
      error: error.message
    });
  }
});

// Get a specific volunteer task by ID (must come BEFORE /:volunteerId route)
router.get("/tasks/:taskId", authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;

    // Check if user is either volunteer or NGO
    if (req.user.userType !== "volunteer" && req.user.userType !== "ngo") {
      return res.status(403).json({
        success: false,
        message: "Only volunteers and NGOs can access task details",
      });
    }

    const taskRef = db.collection("volunteer_tasks").doc(taskId);
    const taskDoc = await taskRef.get();

    if (!taskDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const taskData = taskDoc.data();

    // Check if the user has permission to view this task
    // Volunteers can view tasks they're assigned to or available tasks
    // NGOs can view tasks they created
    if (req.user.userType === "volunteer") {
      if (
        taskData.status !== "available" &&
        taskData.assignedVolunteerId !== req.user.uid
      ) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to view this task",
        });
      }
    } else if (req.user.userType === "ngo") {
      if (taskData.ngoId !== req.user.uid) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to view this task",
        });
      }
    }

    res.json({
      success: true,
      ...taskData,
      id: taskId,
    });
  } catch (error) {
    console.error("Get volunteer task error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get volunteer task",
      error: error.message,
    });
  }
});

// Get volunteer's task history (must come BEFORE /:volunteerId route)
router.get("/history", authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== "volunteer") {
      return res.status(403).json({
        success: false,
        message: "Only volunteers can access task history",
      });
    }

    const volunteerId = req.user.uid;
    console.log("\n📜 GET /history - Volunteer:", volunteerId);

    let tasks = [];

    // Using a try-catch block to handle the case where the composite index doesn't exist
    try {
      const tasksSnapshot = await db
        .collection("volunteer_tasks")
        .where("assignedVolunteerId", "==", volunteerId)
        .orderBy("assignedAt", "desc")
        .get();

      console.log("📋 Tasks found (with ordering):", tasksSnapshot.size);

      tasksSnapshot.forEach((doc) => {
        tasks.push({
          id: doc.id,
          ...doc.data(),
        });
        console.log(`  ✅ Task: ${doc.id} - ${doc.data().title} (${doc.data().status})`);
      });
    } catch (queryError) {
      // If the composite index doesn't exist, fall back to a query without ordering
      if (queryError.code === 9) {
        // FAILED_PRECONDITION
        console.warn(
          "⚠️ Composite index not found for volunteer tasks, falling back to unordered query"
        );
        const tasksSnapshot = await db
          .collection("volunteer_tasks")
          .where("assignedVolunteerId", "==", volunteerId)
          .get();

        console.log("📋 Tasks found (without ordering):", tasksSnapshot.size);

        // Sort manually in memory
        const tasksArray = [];
        tasksSnapshot.forEach((doc) => {
          tasksArray.push({
            id: doc.id,
            ...doc.data(),
          });
          console.log(`  ✅ Task: ${doc.id} - ${doc.data().title} (${doc.data().status})`);
        });

        // Sort by assignedAt manually
        tasksArray.sort((a, b) => {
          const dateA = a.assignedAt ? new Date(a.assignedAt) : new Date(0);
          const dateB = b.assignedAt ? new Date(b.assignedAt) : new Date(0);
          return dateB - dateA;
        });

        tasks = tasksArray;
      } else {
        // Re-throw if it's a different error
        throw queryError;
      }
    }

    console.log(`📦 Total tasks returned: ${tasks.length}\n`);

    res.json({
      success: true,
      tasks,
    });
  } catch (error) {
    console.error("❌ Get volunteer history error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get volunteer history",
      error: error.message,
    });
  }
});

// Get volunteer details by ID (must come AFTER /donation-tasks and /tasks routes)
router.get("/:volunteerId", authenticateToken, async (req, res) => {
  try {
    const { volunteerId } = req.params;

    // Get volunteer user details
    const volunteerDoc = await db.collection("users").doc(volunteerId).get();

    if (!volunteerDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Volunteer not found"
      });
    }

    const volunteerData = volunteerDoc.data();

    // Check if this user is actually a volunteer
    if (volunteerData.userType !== "volunteer") {
      return res.status(404).json({
        success: false,
        message: "User is not a volunteer"
      });
    }

    res.json({
      success: true,
      volunteer: {
        id: volunteerId,
        name: volunteerData.name,
        email: volunteerData.email,
        phone: volunteerData.phone,
        address: volunteerData.address,
        skills: volunteerData.skills || [],
        availability: volunteerData.availability,
        status: volunteerData.status
      }
    });
  } catch (error) {
    console.error("Get volunteer details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get volunteer details",
      error: error.message
    });
  }
});

// Accept a volunteer task
router.post("/tasks/:taskId/accept", authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== "volunteer") {
      return res.status(403).json({
        success: false,
        message: "Only volunteers can accept tasks",
      });
    }

    const { taskId } = req.params;
    const volunteerId = req.user.uid;

    console.log("\n🎯 POST /tasks/:taskId/accept");
    console.log("   Task ID:", taskId);
    console.log("   Volunteer ID:", volunteerId);

    // Check if task is still available
    const taskRef = db.collection("volunteer_tasks").doc(taskId);
    const taskDoc = await taskRef.get();

    if (!taskDoc.exists) {
      console.log("   ❌ Task not found");
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const taskData = taskDoc.data();
    console.log("   Task status:", taskData.status);

    if (taskData.status !== "available") {
      console.log("   ❌ Task is no longer available");
      return res.status(400).json({
        success: false,
        message: "Task is no longer available",
      });
    }

    // Update task status
    await taskRef.update({
      status: "assigned",
      assignedVolunteerId: volunteerId,
      assignedVolunteerName: req.user.name || 'Volunteer', // Store volunteer name for later reference
      assignedAt: new Date(),
    });

    console.log("   ✅ Task updated successfully");
    console.log("      New status: assigned");
    console.log("      Assigned to:", volunteerId);

    // Record platform activity
    try {
      const activity = {
        type: 'task_assigned',
        title: 'Task Assigned',
        description: `${req.user.name || 'A volunteer'} (Volunteer) accepted task: ${taskData.title}`,
        icon: 'fa-user-check',
        color: '#ffd93d',
        timestamp: new Date(),
        relatedId: taskId
      };

      await db.collection('admin_activities').add(activity);
      console.log(`   📊 Platform activity recorded for task assignment ${taskId}`);
    } catch (actErr) {
      console.warn('   ⚠️ Could not record platform activity:', actErr.message);
    }

    // Notify the NGO that created the task
    const io = req.app.get("io");
    io.to(`ngo-${taskData.ngoId}`).emit("task-assigned", {
      taskId,
      volunteerName: req.user.name,
      message: "A volunteer has accepted your task",
    });

    console.log("   📡 Notified NGO:", taskData.ngoId, "\n");

    res.json({
      success: true,
      message: "Task accepted successfully",
    });
  } catch (error) {
    console.error("❌ Accept task error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to accept task",
      error: error.message,
    });
  }
});

// Complete a volunteer task
router.post("/tasks/:taskId/complete", authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== "volunteer") {
      return res.status(403).json({
        success: false,
        message: "Only volunteers can complete tasks",
      });
    }

    const { taskId } = req.params;
    const volunteerId = req.user.uid;

    const taskRef = db.collection("volunteer_tasks").doc(taskId);
    const taskDoc = await taskRef.get();

    if (!taskDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const taskData = taskDoc.data();

    if (taskData.assignedVolunteerId !== volunteerId) {
      return res.status(403).json({
        success: false,
        message: "Only the assigned volunteer can complete this task",
      });
    }

    // Check if this is a pickup task related to a donation
    if (taskData.donationId && taskData.type === "pickup") {
      // For pickup tasks, we need to verify the donation status flow:
      // 1. Donor must mark as "picked up"
      // 2. NGO must mark as "received"
      // Only then can volunteer complete the task

      const donationRef = db.collection("donations").doc(taskData.donationId);
      const donationDoc = await donationRef.get();

      if (!donationDoc.exists) {
        return res.status(404).json({
          success: false,
          message: "Related donation not found",
        });
      }

      const donationData = donationDoc.data();

      // Check if donor has marked donation as "picked up"
      if (
        donationData.status !== "picked_up" &&
        donationData.status !== "received"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Donor must mark donation as 'picked up' before volunteer can complete task",
        });
      }

      // Check if NGO has marked donation as "received" (if donor has marked as picked up)
      if (donationData.status === "picked_up") {
        return res.status(400).json({
          success: false,
          message:
            "NGO must mark donation as 'received' before volunteer can complete task",
        });
      }
    }

    // Update task status
    await taskRef.update({
      status: "completed",
      completedAt: new Date(),
    });

    // Record platform activity
    try {
      const activity = {
        type: 'task_completed',
        title: 'Task Completed',
        description: `${req.user.name || 'A volunteer'} (Volunteer) completed task: ${taskData.title}`,
        icon: 'fa-check-circle',
        color: '#00b894',
        timestamp: new Date(),
        relatedId: taskId
      };

      await db.collection('admin_activities').add(activity);
      console.log(`Platform activity recorded for task completion ${taskId}`);
    } catch (actErr) {
      console.warn('Could not record platform activity:', actErr.message);
    }

    // If this task is related to a donation, update the donation status
    if (taskData.donationId) {
      const donationRef = db.collection("donations").doc(taskData.donationId);
      const donationDoc = await donationRef.get();

      if (donationDoc.exists) {
        const donationData = donationDoc.data();

        // If it's a pickup task, mark donation as ready for NGO completion
        if (taskData.type === "pickup") {
          await donationRef.update({
            volunteerTaskCompleted: true,
          });

          // Notify donor and NGO
          const io = req.app.get("io");
          io.to(`donor-${donationData.donorId}`).emit(
            "donation-volunteer-completed",
            {
              donationId: taskData.donationId,
              message: "Volunteer has completed pickup task for your donation",
            }
          );

          io.to(`ngo-${donationData.matchedNgoId}`).emit(
            "donation-volunteer-completed",
            {
              donationId: taskData.donationId,
              message: "Volunteer has completed pickup task for donation",
            }
          );
        }
      }
    }

    // Notify the NGO that created the task
    const io = req.app.get("io");
    io.to(`ngo-${taskData.ngoId}`).emit("task-completed", {
      taskId,
      message: "Volunteer has completed the task",
    });

    res.json({
      success: true,
      message: "Task completed successfully",
    });
  } catch (error) {
    console.error("Complete task error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to complete task",
      error: error.message,
    });
  }
});

// Create volunteer task (for NGOs)
router.post("/create-task", authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== "ngo") {
      return res.status(403).json({
        success: false,
        message: "Only NGOs can create volunteer tasks",
      });
    }

    // Extract all possible fields from the request body
    const {
      title,
      description,
      location,
      date,
      type,
      requiredSkills,
      estimatedDuration,
      donationId, // This might be sent when linking a task to a donation
    } = req.body;

    const ngoId = req.user.uid;

    // Validate required fields
    if (!title || !description || !location || !date || !type) {
      return res.status(400).json({
        success: false,
        message: "Title, description, location, date, and type are required",
      });
    }

    // Get NGO details
    const ngoDoc = await db.collection("users").doc(ngoId).get();

    if (!ngoDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "NGO not found",
      });
    }

    const ngoData = ngoDoc.data();

    const taskData = {
      ngoId,
      ngoName: ngoData.name,
      title,
      description,
      location,
      date, // Add the date field
      type, // Add the type field
      requiredSkills: requiredSkills || [],
      estimatedDuration: estimatedDuration || null,
      status: "available",
      createdAt: new Date(),
      assignedVolunteerId: null,
      assignedAt: null,
      completedAt: null,
    };

    // Add donationId if provided
    if (donationId) {
      taskData.donationId = donationId;

      // Update the donation to indicate it has a pickup task
      if (type === "pickup") {
        const donationRef = db.collection("donations").doc(donationId);
        await donationRef.update({
          hasPickupTask: true,
        });
      }
    }

    const taskRef = await db.collection("volunteer_tasks").add(taskData);

    // Record platform activity
    try {
      const activity = {
        type: 'task_created',
        title: 'Volunteer Task Created',
        description: `${ngoData.name || 'An NGO'} (NGO) created task: ${title}`,
        icon: 'fa-tasks',
        color: '#667eea',
        timestamp: new Date(),
        relatedId: taskRef.id
      };

      await db.collection('admin_activities').add(activity);
      console.log(`Platform activity recorded for task creation ${taskRef.id}`);
    } catch (actErr) {
      console.warn('Could not record platform activity:', actErr.message);
    }

    // Emit real-time notification to volunteers
    const io = req.app.get("io");
    io.emit("new-volunteer-task", {
      taskId: taskRef.id,
      title: taskData.title,
      location: taskData.location,
      type: taskData.type,
    });

    res.status(201).json({
      success: true,
      taskId: taskRef.id,
      message: "Volunteer task created successfully",
    });
  } catch (error) {
    console.error("Create volunteer task error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create volunteer task",
      error: error.message,
    });
  }
});

// Cancel a volunteer task (only available tasks can be cancelled by the NGO who created them)
router.post("/tasks/:taskId/cancel", authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.uid;

    console.log("Cancelling volunteer task:", { taskId, userId });

    // Get task document
    const taskRef = db.collection("volunteer_tasks").doc(taskId);
    const taskDoc = await taskRef.get();

    if (!taskDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Volunteer task not found",
      });
    }

    const task = taskDoc.data();

    // Check if user is the NGO who created this task
    if (task.ngoId !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only cancel your own volunteer tasks",
      });
    }

    // Check if task can be cancelled
    // Can cancel if: available (not yet assigned or in progress)
    const canCancel = 
      task.status === 'available';
    
    if (!canCancel) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel task with status: ${task.status}. Only available tasks can be cancelled.`,
      });
    }

    // Update task status to cancelled
    await taskRef.update({
      status: "cancelled",
      cancelledAt: new Date(),
      cancelledBy: userId,
    });

    console.log("Volunteer task cancelled successfully:", taskId);

    // Record platform activity
    let activityRef = null;
    try {
      const activity = {
        type: 'task_cancelled',
        title: 'Task Cancelled',
        description: `${task.ngoName || 'NGO'} (NGO) cancelled task: ${task.title}`,
        icon: 'fa-times-circle',
        color: '#ff6b6b',
        timestamp: new Date(),
        relatedId: taskId
      };

      activityRef = await db.collection('admin_activities').add(activity);
      console.log(`Platform activity recorded for task ${taskId}, activityId=${activityRef.id}`);
    } catch (actErr) {
      console.warn('Could not record platform activity:', actErr.message);
    }

    // Emit real-time update to NGO
    const io = req.app.get("io");
    io.to(`ngo-${userId}`).emit("task-cancelled", {
      taskId,
      message: "Volunteer task cancelled successfully",
    });

    // Notify admin dashboards to refresh activities
    if (io && activityRef) {
      io.emit('platform-activity', { 
        action: 'new_activity', 
        activity: { 
          id: activityRef.id, 
          type: 'task_cancelled',
          title: 'Task Cancelled',
          description: `${task.ngoName || 'NGO'} (NGO) cancelled task: ${task.title}`,
          icon: 'fa-times-circle',
          color: '#ff6b6b',
          timestamp: new Date(),
          relatedId: taskId
        } 
      });
      console.log('Sent platform-activity notification for task cancellation');
    }

    res.json({
      success: true,
      message: "Volunteer task cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel volunteer task error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cancel volunteer task",
      error: error.message,
    });
  }
});

module.exports = router;
