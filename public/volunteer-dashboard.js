// Initialize Socket.IO
const socket = io();

// Global variables
let currentUser = null;

// DOM elements
const volunteerNameElement = document.getElementById("volunteerName");
const totalTasksElement = document.getElementById("totalTasks");
const completedTasksElement = document.getElementById("completedTasks");
const activeTasksElement = document.getElementById("activeTasks");
const ngosHelpedElement = document.getElementById("ngosHelped");
const availableTasksElement = document.getElementById("availableTasks");
const myTasksElement = document.getElementById("myTasks");
const taskHistoryElement = document.getElementById("taskHistory");
const refreshTasksBtn = document.getElementById("refreshTasks");
const refreshHistoryBtn = document.getElementById("refreshHistory");
const logoutBtn = document.getElementById("logoutBtn");
const taskModal = document.getElementById("taskModal");
const taskDetails = document.getElementById("taskDetails");
const notificationToast = document.getElementById("notificationToast");
const toastMessage = document.getElementById("toastMessage");

// Initialize dashboard
document.addEventListener("DOMContentLoaded", async () => {
  await checkAuth();
  await loadVolunteerData();
  await loadAvailableTasks();
  await loadMyTasks();
  await loadTaskHistory();
  await updateStatistics();
  setupEventListeners();
  setupSocketListeners();
});

// Check authentication
async function checkAuth() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/";
    return;
  }

  try {
    const response = await fetch("/api/auth/profile", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Authentication failed");
    }

    const result = await response.json();
    currentUser = result.user;

    // Fix: Use userType instead of role
    if (currentUser.userType !== "volunteer") {
      showNotification(
        "Unauthorized access. Please log in as volunteer.",
        "error"
      );
      setTimeout(() => {
        localStorage.removeItem("token");
        window.location.href = "/";
      }, 2000);
      return;
    }
  } catch (error) {
    console.error("Auth check failed:", error);
    showNotification("Session expired, please log in again.", "error");
    setTimeout(() => {
      localStorage.removeItem("token");
      window.location.href = "/";
    }, 2000);
  }
}

// Load volunteer data
async function loadVolunteerData() {
  volunteerNameElement.textContent = currentUser.name || currentUser.email;
}

// Load available tasks
async function loadAvailableTasks() {
  try {
    console.log("📋 Loading available tasks...");
    const response = await fetch("/api/volunteers/tasks", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (response.ok) {
      const result = await response.json();
      console.log("📦 Tasks API returned:", result.tasks?.length || 0, "total tasks");
      const availableTasks = result.tasks
        ? result.tasks.filter((task) => task.status === "available")
        : [];
      console.log("✅ Filtered available tasks:", availableTasks.length, "tasks");
      renderAvailableTasks(availableTasks);
    } else {
      const error = await response.json();
      console.error("❌ Failed to load available tasks:", error);
      showNotification(
        error.message || "Failed to load available tasks",
        "error"
      );
      availableTasksElement.innerHTML =
        '<div class="error">Failed to load available tasks</div>';
    }
  } catch (error) {
    console.error("❌ Exception loading available tasks:", error);
    showNotification("Failed to load available tasks", "error");
    availableTasksElement.innerHTML =
      '<div class="error">Failed to load available tasks</div>';
  }
}

// Load my tasks
async function loadMyTasks() {
  try {
    console.log("📋 Loading my tasks...");
    const response = await fetch("/api/volunteers/tasks", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (response.ok) {
      const result = await response.json();
      console.log("📦 Tasks API returned:", result.tasks?.length || 0, "tasks");
      const myTasks = result.tasks
        ? result.tasks.filter(
            (task) => task.status === "assigned" || task.status === "completed"
          )
        : [];
      console.log("✅ Filtered my tasks:", myTasks.length, "tasks");
      console.log("📊 Task statuses:", myTasks.map(t => t.status));
      renderMyTasks(myTasks);
    } else {
      const error = await response.json();
      console.error("❌ Failed to load my tasks:", error);
      showNotification(error.message || "Failed to load my tasks", "error");
      myTasksElement.innerHTML =
        '<div class="error">Failed to load my tasks</div>';
    }
  } catch (error) {
    console.error("❌ Exception loading my tasks:", error);
    showNotification("Failed to load my tasks", "error");
    myTasksElement.innerHTML =
      '<div class="error">Failed to load my tasks</div>';
  }
}

// Load task history
async function loadTaskHistory() {
  try {
    console.log("📜 Loading task history...");
    const response = await fetch("/api/volunteers/history", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (response.ok) {
      const result = await response.json();
      console.log("📦 History API returned:", result.tasks?.length || 0, "tasks");
      const history = result.tasks || [];
      console.log("✅ Task history:", history.map(t => ({ id: t.id, title: t.title, status: t.status })));
      renderTaskHistory(history);
    } else {
      const error = await response.json();
      console.error("❌ Failed to load task history:", error);
      showNotification(error.message || "Failed to load task history", "error");
      taskHistoryElement.innerHTML =
        '<div class="error">Failed to load task history</div>';
    }
  } catch (error) {
    console.error("❌ Exception loading task history:", error);
    showNotification("Failed to load task history", "error");
    taskHistoryElement.innerHTML =
      '<div class="error">Failed to load task history</div>';
  }
}

// Update statistics
async function updateStatistics() {
  try {
    console.log("📊 Updating statistics...");
    const response = await fetch("/api/volunteers/history", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (response.ok) {
      const result = await response.json();
      const history = result.tasks || [];
      console.log("📦 Statistics API returned:", history.length, "tasks");

      const totalTasks = history.length;
      const completedTasks = history.filter(
        (t) => t.status === "completed"
      ).length;
      const activeTasks = history.filter((t) => t.status === "assigned").length;

      // Count unique NGOs helped
      const ngosHelped = new Set(
        history
          .filter((t) => t.status === "completed" && t.ngoName)
          .map((t) => t.ngoName)
      ).size;

      console.log("📊 Stats:", { totalTasks, completedTasks, activeTasks, ngosHelped });

      totalTasksElement.textContent = totalTasks;
      completedTasksElement.textContent = completedTasks;
      activeTasksElement.textContent = activeTasks;
      ngosHelpedElement.textContent = ngosHelped;
      console.log("✅ Statistics updated in DOM");
    } else {
      const error = await response.json();
      console.error("❌ Failed to update statistics:", error);
      showNotification(error.message || "Failed to update statistics", "error");
    }
  } catch (error) {
    console.error("❌ Exception updating statistics:", error);
    showNotification("Failed to update statistics", "error");
  }
}

// Render available tasks
function renderAvailableTasks(tasks) {
  if (tasks.length === 0) {
    availableTasksElement.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tasks"></i>
                <p>No available tasks at the moment</p>
                <p>Check back later for new opportunities!</p>
            </div>
        `;
    return;
  }

  availableTasksElement.innerHTML = tasks
    .map(
      (task) => `
        <div class="task-item" onclick="showTaskDetails('${task.id}')">
            <div class="task-header">
                <h4 class="task-title">${task.title}</h4>
                <span class="task-status pending">${getStatusText(
                  task.status
                )}</span>
            </div>
            <div class="task-details">
                <p><strong>Type:</strong> ${task.type}</p>
                <p><strong>Location:</strong> ${task.location}</p>
                <p><strong>Date:</strong> ${
                  task.date ? new Date(task.date).toLocaleDateString() : "N/A"
                }</p>
                <p><strong>NGO:</strong> ${task.ngoName || "N/A"}</p>
            </div>
            <div class="task-actions">
                <button class="btn-success" onclick="event.stopPropagation(); acceptTask('${
                  task.id
                }')">
                    Accept Task
                </button>
            </div>
        </div>
    `
    )
    .join("");
}

// Render my tasks
function renderMyTasks(tasks) {
  console.log("🎨 Rendering my tasks:", tasks.length, "tasks");
  
  if (tasks.length === 0) {
    console.log("⚠️ No tasks to display");
    myTasksElement.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard"></i>
                <p>No tasks accepted yet</p>
                <p>Accept a task to get started!</p>
            </div>
        `;
    return;
  }

  myTasksElement.innerHTML = tasks
    .map((task) => {
      // For pickup tasks linked to donations, check if donation is in proper status
      let canComplete = task.status === "assigned";
      let completionMessage = "";

      // If it's a pickup task with a donation, check donation status
      if (
        task.type === "pickup" &&
        task.donationId &&
        task.status === "assigned"
      ) {
        // In the UI, we'll show a message about the requirements
        canComplete = false; // We'll handle this on the backend
        completionMessage =
          "Waiting for donor to mark as picked up and NGO to mark as received";
      }

      return `
        <div class="task-item ${task.status}" onclick="showTaskDetails('${
        task.id
      }')">
            <div class="task-header">
                <h4 class="task-title">${task.title}</h4>
                <span class="task-status ${task.status}">${getStatusText(
        task.status
      )}</span>
            </div>
            <div class="task-details">
                <p><strong>Type:</strong> ${task.type || 'N/A'}</p>
                <p><strong>Location:</strong> ${task.location || 'N/A'}</p>
                <p><strong>Date:</strong> ${
                  task.date ? new Date(task.date._seconds ? task.date._seconds * 1000 : task.date).toLocaleDateString() : "N/A"
                }</p>
                <p><strong>NGO:</strong> ${task.ngoName || "N/A"}</p>
                ${
                  task.assignedAt
                    ? `<p><strong>Accepted:</strong> ${new Date(
                        task.assignedAt._seconds ? task.assignedAt._seconds * 1000 : task.assignedAt
                      ).toLocaleDateString()}</p>`
                    : ""
                }
                ${
                  task.donationId
                    ? `<p><strong>Donation ID:</strong> ${task.donationId}</p>`
                    : ""
                }
                ${
                  completionMessage
                    ? `<p><strong>Status:</strong> ${completionMessage}</p>`
                    : ""
                }
            </div>
            ${
              canComplete
                ? `
                <div class="task-actions">
                    <button class="btn-success" onclick="event.stopPropagation(); completeTask('${task.id}')">
                        Mark Complete
                    </button>
                </div>
            `
                : task.status === "assigned"
                ? `
                <div class="task-actions">
                    <button class="btn-secondary" disabled title="Waiting for donation status updates">
                        Awaiting Completion
                    </button>
                </div>
                `
                : ""
            }
        </div>
    `;
    })
    .join("");
    
  console.log("✅ My tasks rendered successfully");
}

// Render task history
function renderTaskHistory(tasks) {
  console.log("🎨 Rendering task history:", tasks.length, "tasks");
  
  if (tasks.length === 0) {
    console.log("⚠️ No tasks to display");
    taskHistoryElement.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-history"></i>
                <p>No task history yet</p>
            </div>
        `;
    return;
  }

  // Sort by completion date (newest first)
  const sortedTasks = tasks.sort((a, b) => {
    const dateB = b.completedAt
      ? new Date(b.completedAt)
      : b.assignedAt
      ? new Date(b.assignedAt)
      : new Date(0);
    const dateA = a.completedAt
      ? new Date(a.completedAt)
      : a.assignedAt
      ? new Date(a.assignedAt)
      : new Date(0);
    return dateB - dateA;
  });

  // Show only the 5 most recent tasks
  const recentTasks = sortedTasks.slice(0, 5);
  console.log("📊 Showing", recentTasks.length, "recent tasks");

  taskHistoryElement.innerHTML = recentTasks
    .map(
      (task) => `
        <div class="task-item ${task.status}" onclick="showTaskDetails('${
        task.id
      }')">
            <div class="task-header">
                <h4 class="task-title">${task.title}</h4>
                <span class="task-status ${task.status}">${getStatusText(
        task.status
      )}</span>
            </div>
            <div class="task-details">
                <p><strong>Type:</strong> ${task.type || 'N/A'}</p>
                <p><strong>Location:</strong> ${task.location || 'N/A'}</p>
                <p><strong>NGO:</strong> ${task.ngoName || "N/A"}</p>
                ${
                  task.assignedAt
                    ? `<p><strong>Accepted:</strong> ${new Date(
                        task.assignedAt._seconds ? task.assignedAt._seconds * 1000 : task.assignedAt
                      ).toLocaleDateString()}</p>`
                    : ""
                }
                ${
                  task.status === "completed" && task.completedAt
                    ? `<p><strong>Completed:</strong> ${new Date(
                        task.completedAt._seconds ? task.completedAt._seconds * 1000 : task.completedAt
                      ).toLocaleDateString()}</p>`
                    : ""
                }
            </div>
        </div>
    `
    )
    .join("");
    
  console.log("✅ Task history rendered successfully");
}

// Get status text
function getStatusText(status) {
  const statusMap = {
    available: "Available",
    assigned: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return statusMap[status] || status;
}

// Show task details
async function showTaskDetails(taskId) {
  try {
    const response = await fetch(`/api/volunteers/tasks/${taskId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (response.ok) {
      const task = await response.json();

      taskDetails.innerHTML = `
                <div class="detail-item">
                    <span class="detail-label">Task Title:</span>
                    <span class="detail-value">${task.title}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Description:</span>
                    <span class="detail-value">${task.description}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Type:</span>
                    <span class="detail-value">${task.type}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Location:</span>
                    <span class="detail-value">${task.location}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Date:</span>
                    <span class="detail-value">${
                      task.date
                        ? new Date(task.date).toLocaleDateString()
                        : "N/A"
                    }</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Status:</span>
                    <span class="detail-value">${getStatusText(
                      task.status
                    )}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">NGO:</span>
                    <span class="detail-value">${task.ngoName || "N/A"}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Created:</span>
                    <span class="detail-value">${
                      task.createdAt
                        ? new Date(task.createdAt).toLocaleString()
                        : "N/A"
                    }</span>
                </div>
                ${
                  task.assignedAt
                    ? `
                    <div class="detail-item">
                        <span class="detail-label">Accepted:</span>
                        <span class="detail-value">${new Date(
                          task.assignedAt
                        ).toLocaleString()}</span>
                    </div>
                `
                    : ""
                }
                ${
                  task.completedAt
                    ? `
                    <div class="detail-item">
                        <span class="detail-label">Completed:</span>
                        <span class="detail-value">${new Date(
                          task.completedAt
                        ).toLocaleString()}</span>
                    </div>
                `
                    : ""
                }
                ${
                  task.donationId
                    ? `
                    <div class="detail-item">
                        <span class="detail-label">Donation ID:</span>
                        <span class="detail-value">${task.donationId}</span>
                    </div>
                `
                    : ""
                }
                ${
                  task.status === "assigned" &&
                  task.type === "pickup" &&
                  task.donationId
                    ? `
                    <div class="detail-info" style="margin-top: 1rem; padding: 1rem; background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px;">
                        <p><strong>Completion Requirements:</strong></p>
                        <p>1. Donor must mark donation as "Picked Up"</p>
                        <p>2. NGO must mark donation as "Received"</p>
                        <p>3. Then you can mark this task as completed</p>
                    </div>
                    <div class="detail-actions" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #eee;">
                        <button class="btn-success" onclick="checkTaskCompletion('${task.id}')" style="width: 100%;">
                            Attempt to Complete Task
                        </button>
                    </div>
                `
                    : task.status === "assigned"
                    ? `
                    <div class="detail-actions" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #eee;">
                        <button class="btn-success" onclick="completeTask('${task.id}'); closeModal('taskModal');" style="width: 100%;">
                            Mark Task Complete
                        </button>
                    </div>
                `
                    : ""
                }
            `;

      showModal("taskModal");
    } else {
      const error = await response.json();
      showNotification(error.message || "Failed to load task details", "error");
    }
  } catch (error) {
    console.error("Failed to load task details:", error);
    // Handle case where response is not JSON (e.g., HTML error page)
    if (error instanceof SyntaxError) {
      showNotification("Failed to load task details. Server error.", "error");
    } else {
      showNotification("Failed to load task details", "error");
    }
  }
}

// Accept task
async function acceptTask(taskId) {
  try {
    console.log("🎯 Accepting task:", taskId);
    const response = await fetch(`/api/volunteers/tasks/${taskId}/accept`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const result = await response.json();
      console.log("✅ Task accepted successfully:", result);
      showNotification(
        result.message || "Task accepted successfully!",
        "success"
      );
      
      console.log("🔄 Reloading available tasks...");
      await loadAvailableTasks();
      console.log("🔄 Reloading my tasks...");
      await loadMyTasks();
      console.log("🔄 Updating statistics...");
      await updateStatistics();
      console.log("✅ All sections updated");
    } else {
      const error = await response.json();
      console.error("❌ Failed to accept task:", error);
      showNotification(error.message || "Failed to accept task", "error");
    }
  } catch (error) {
    console.error("❌ Exception accepting task:", error);
    showNotification("Failed to accept task", "error");
  }
}

// Complete task
async function completeTask(taskId) {
  try {
    const response = await fetch(`/api/volunteers/tasks/${taskId}/complete`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const result = await response.json();
      showNotification(
        result.message || "Task completed successfully!",
        "success"
      );
      await loadMyTasks();
      await loadTaskHistory();
      await updateStatistics();
    } else {
      const error = await response.json();
      showNotification(error.message || "Failed to complete task", "error");
    }
  } catch (error) {
    console.error("Failed to complete task:", error);
    showNotification("Failed to complete task", "error");
  }
}

// Setup event listeners
function setupEventListeners() {
  // Refresh tasks
  refreshTasksBtn.addEventListener("click", async () => {
    await loadAvailableTasks();
    showNotification("Available tasks refreshed", "info");
  });

  // Refresh history
  refreshHistoryBtn.addEventListener("click", async () => {
    await loadTaskHistory();
    await updateStatistics();
    showNotification("Task history refreshed", "info");
  });

  // Logout button
  logoutBtn.addEventListener("click", async () => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        // Call logout API to update status
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("token");
      window.location.href = "/";
    }
  });
}

// Setup Socket.IO listeners
function setupSocketListeners() {
  // Task assigned notification
  socket.on("task-assigned", (data) => {
    showNotification(`Task assigned: ${data.message}`, "success");
    loadMyTasks();
  });

  // Task completed notification
  socket.on("task-completed", (data) => {
    showNotification(`Task completed: ${data.message}`, "success");
    loadMyTasks();
    loadTaskHistory();
    updateStatistics();
  });

  // Donation completed notification
  socket.on("donation-completed", (data) => {
    showNotification(data.message, "success");
    loadMyTasks();
    loadTaskHistory();
    updateStatistics();
  });
}

// Utility functions
function showModal(modalId) {
  document.getElementById(modalId).classList.remove("hidden");
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.add("hidden");
}

function showNotification(message, type = "info") {
  toastMessage.textContent = message;
  notificationToast.className = `notification-toast ${type}`;
  notificationToast.classList.remove("hidden");

  setTimeout(() => {
    notificationToast.classList.add("hidden");
  }, 5000);
}

// Close modals when clicking outside
window.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal")) {
    e.target.classList.add("hidden");
  }
});

// Close modals with Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document.querySelectorAll(".modal").forEach((modal) => {
      modal.classList.add("hidden");
    });
  }
});

// Add some additional CSS for volunteer-specific elements
const additionalStyles = `
    .task-item {
        background: #f8f9fa;
        border-radius: 10px;
        padding: 1rem;
        margin-bottom: 1rem;
        border-left: 4px solid #ff6b6b;
        transition: all 0.3s ease;
        cursor: pointer;
    }
    
    .task-item:hover {
        background: #e9ecef;
        transform: translateX(5px);
    }
    
    .task-item.assigned {
        border-left-color: #00b894;
        background: #f0fff4;
    }
    
    .task-item.completed {
        border-left-color: #6c757d;
        background: #f8f9fa;
        opacity: 0.7;
    }
    
    .task-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 0.5rem;
    }
    
    .task-title {
        font-weight: 600;
        color: #2d3748;
        margin: 0;
    }
    
    .task-status {
        padding: 0.25rem 0.5rem;
        border-radius: 15px;
        font-size: 0.8rem;
        font-weight: 500;
    }
    
    .task-status.available {
        background: #ffd93d;
        color: #856404;
    }
    
    .task-status.assigned {
        background: #00b894;
        color: white;
    }
    
    .task-status.completed {
        background: #6c757d;
        color: white;
    }
    
    .task-status.cancelled {
        background: #ff6b6b;
        color: white;
    }
    
    .task-details {
        color: #4a5568;
        font-size: 0.9rem;
        margin-bottom: 0.5rem;
    }
    
    .task-actions {
        display: flex;
        gap: 0.5rem;
        margin-top: 0.5rem;
    }
    
    .task-details {
        padding: 1.5rem;
        max-height: 400px;
        overflow-y: auto;
    }
`;

// Inject additional styles
const styleSheet = document.createElement("style");
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

// Check task completion requirements and attempt to complete
async function checkTaskCompletion(taskId) {
  try {
    // Attempt to complete the task
    await completeTask(taskId);
    closeModal("taskModal");
  } catch (error) {
    console.error("Failed to check task completion:", error);
    // The completeTask function will already show the error notification
  }
}

// Add CSS for clickable statistics
const statStyles = `
  .stat-clickable {
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }
  
  .stat-clickable:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }
  
  .stat-clickable:hover .stat-number,
  .stat-clickable:hover .stat-label {
    color: white;
  }
  
  .stat-clickable::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: 0.5s;
  }
  
  .stat-clickable:hover::before {
    left: 100%;
  }
  
  .stat-hint {
    font-size: 0.7rem;
    opacity: 0.7;
    margin-top: 5px;
    transition: opacity 0.3s ease;
  }
  
  .stat-clickable:hover .stat-hint {
    opacity: 1;
    color: rgba(255, 255, 255, 0.9);
  }
`;

// Inject stat styles
const statStyleSheet = document.createElement("style");
statStyleSheet.textContent = statStyles;
document.head.appendChild(statStyleSheet);
