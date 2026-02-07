// Initialize Socket.IO
const socket = io();

// Global variables
let currentUser = null;
let currentNGOId = null;

// DOM elements
const adminNameElement = document.getElementById("adminName");
const totalUsersElement = document.getElementById("totalUsers");
const totalDonationsElement = document.getElementById("totalDonations");
const totalDonorsElement = document.getElementById("totalDonors");
const totalVolunteersElement = document.getElementById("totalVolunteers");
const verifiedNGOsElement = document.getElementById("verifiedNGOs");
const pendingNGOsElement = document.getElementById("pendingNGOs");
const pendingNGOsListElement = document.getElementById("pendingNGOsList");
const recentDonationsElement = document.getElementById("recentDonations");
const platformActivityElement = document.getElementById("platformActivity");
const refreshStatsBtn = document.getElementById("refreshStats");
const refreshNGOsBtn = document.getElementById("refreshNGOs");
const refreshDonationsBtn = document.getElementById("refreshDonations");
const refreshActivityBtn = document.getElementById("refreshActivity");
const logoutBtn = document.getElementById("logoutBtn");
const ngoVerificationModal = document.getElementById("ngoVerificationModal");
const ngoVerificationDetails = document.getElementById(
  "ngoVerificationDetails"
);
const donationModal = document.getElementById("donationModal");
const donationDetails = document.getElementById("donationDetails");
const notificationToast = document.getElementById("notificationToast");
const toastMessage = document.getElementById("toastMessage");

// Initialize dashboard
document.addEventListener("DOMContentLoaded", () => {
  // Show admin login form if not authenticated
  if (!localStorage.getItem("token")) {
    document.getElementById("adminLoginContainer").style.display = "";
    document.getElementById("adminDashboardContainer").style.display = "none";
  } else {
    document.getElementById("adminLoginContainer").style.display = "none";
    document.getElementById("adminDashboardContainer").style.display = "";
    initAdminDashboard();
  }

  // Admin login form submit
  const loginForm = document.getElementById("staticAdminLoginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = document.getElementById("adminUsername").value;
      const password = document.getElementById("adminPassword").value;
      const errorDiv = document.getElementById("adminLoginError");
      errorDiv.style.display = "none";

      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: username, password }),
        });
        const result = await response.json();
        if (
          result.success &&
          result.token &&
          result.user.userType === "admin"
        ) {
          localStorage.setItem("token", result.token);
          document.getElementById("adminLoginContainer").style.display = "none";
          document.getElementById("adminDashboardContainer").style.display = "";
          initAdminDashboard();
        } else {
          errorDiv.textContent = result.message || "Invalid credentials";
          errorDiv.style.display = "block";
        }
      } catch (err) {
        errorDiv.textContent = "Login failed. Please try again.";
        errorDiv.style.display = "block";
      }
    });
  }
  // Initialize toggles if any present on admin page
  initPasswordToggles();
});

async function initAdminDashboard() {
  await checkAuth();
  await loadAdminData();
  await loadPlatformStatistics();
  await loadPendingNGOs();
  await loadRecentDonations();
  await loadPlatformActivities();
  setupEventListeners();
  setupSocketListeners();
}

// Check authentication
async function checkAuth() {
  const token = localStorage.getItem("token");
  const errorContainer =
    document.getElementById("auth-error") || createAuthErrorContainer();
  if (!token) {
    errorContainer.textContent =
      "No authentication token found. Please log in as admin.";
    errorContainer.style.display = "block";
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

    currentUser = await response.json();
    if (!currentUser.user || currentUser.user.userType !== "admin") {
      errorContainer.textContent = "Access denied. Admin privileges required.";
      errorContainer.style.display = "block";
      return;
    }
    errorContainer.style.display = "none";
  } catch (error) {
    console.error("Auth check failed:", error);
    localStorage.removeItem("token");
    errorContainer.textContent =
      "Authentication failed. Please log in again as admin.";
    errorContainer.style.display = "block";
  }
}

function createAuthErrorContainer() {
  const div = document.createElement("div");
  div.id = "auth-error";
  div.style.color = "red";
  div.style.background = "#ffe0e0";
  div.style.padding = "10px";
  div.style.margin = "10px 0";
  div.style.border = "1px solid #ff0000";
  div.style.display = "none";
  div.style.textAlign = "center";
  document.body.prepend(div);
  return div;
}

// Load admin data
async function loadAdminData() {
  adminNameElement.textContent =
    (currentUser.user && currentUser.user.name) || "Admin";
}

// Load platform statistics
async function loadPlatformStatistics() {
  try {
    const response = await fetch("/api/admin/statistics", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      const stats = data.statistics || {};

      totalUsersElement.textContent = stats.totalUsers || 0;
      totalDonationsElement.textContent = stats.totalDonations || 0;
      totalDonorsElement.textContent = stats.totalDonors || 0;
      totalVolunteersElement.textContent = stats.totalVolunteers || 0;
      verifiedNGOsElement.textContent = stats.verifiedNgos || 0;
      pendingNGOsElement.textContent = stats.pendingVerifications || 0;
    }
  } catch (error) {
    console.error("Failed to load platform statistics:", error);
    showNotification("Failed to load platform statistics", "error");
  }
}

// Load pending NGOs
async function loadPendingNGOs() {
  try {
    const response = await fetch("/api/admin/pending-ngos", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      renderPendingNGOs(data.pendingNgos || []);
    }
  } catch (error) {
    console.error("Failed to load pending NGOs:", error);
    pendingNGOsListElement.innerHTML = `
      <div class="error">
        <i class="fas fa-exclamation-circle"></i>
        <p>Failed to load pending NGOs</p>
        <p class="error-details">${error.message}</p>
      </div>`;
  }
}

// Load recent donations
async function loadRecentDonations() {
  try {
    const response = await fetch("/api/admin/donations", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      renderRecentDonations(data.donations || []);
    }
  } catch (error) {
    console.error("Failed to load recent donations:", error);
    recentDonationsElement.innerHTML =
      '<div class="error">Failed to load recent donations</div>';
  }
}

// Load platform activities
async function loadPlatformActivities() {
  try {
    const response = await fetch("/api/admin/activities", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      renderPlatformActivities(data.activities || []);
    }
  } catch (error) {
    console.error("Failed to load platform activities:", error);
    platformActivityElement.innerHTML =
      '<div class="error">Failed to load activities</div>';
  }
}

// Render pending NGOs
function renderPendingNGOs(ngos) {
  if (ngos.length === 0) {
    pendingNGOsListElement.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-user-check"></i>
                <p>No pending NGO verifications</p>
            </div>
        `;
    return;
  }

  pendingNGOsListElement.innerHTML = ngos
    .map(
      (ngo) => {
        const createdDate = formatFirestoreDate(ngo.createdAt);
        return `
        <div class="ngo-item" onclick="showNGOVerification('${ngo.id}')">
            <div class="ngo-header">
                <h4 class="ngo-title">${ngo.name}</h4>
                <span class="ngo-date">${createdDate ? createdDate.toLocaleDateString() : 'N/A'}</span>
            </div>
            <div class="ngo-details">
                <p><strong>Address:</strong> ${ngo.address}</p>
                <p><strong>Contact:</strong> ${ngo.contact}</p>
                <p><strong>Registration ID:</strong> ${ngo.registrationId}</p>
            </div>
            <div class="ngo-actions">
                <button class="btn-success" onclick="event.stopPropagation(); approveNGO('${ngo.id}')">
                    Approve
                </button>
                <button class="btn-danger" onclick="event.stopPropagation(); rejectNGO('${ngo.id}')">
                    Reject
                </button>
            </div>
        </div>
    `;
      }
    )
    .join("");
}

// Render recent donations
function renderRecentDonations(donations) {
  if (donations.length === 0) {
    recentDonationsElement.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-gift"></i>
                <p>No donations yet</p>
            </div>
        `;
    return;
  }

  // Sort by creation date (newest first) and show only the 5 most recent
  const sortedDonations = donations.sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  const recentDonations = sortedDonations.slice(0, 5);

  recentDonationsElement.innerHTML = recentDonations
    .map(
      (donation) => {
        const createdDate = formatFirestoreDate(donation.createdAt);
        return `
        <div class="donation-item ${
          donation.status
        }" onclick="showDonationDetails('${donation.id}')">
            <div class="donation-header">
                <h4 class="donation-title">${donation.itemType} - ${
        donation.quantity
      }</h4>
                <span class="donation-status ${
                  donation.status
                }">${getStatusText(donation.status)}</span>
            </div>
            <div class="donation-details">
                <p><strong>Donor:</strong> ${donation.donorName}</p>
                <p><strong>Location:</strong> ${donation.pickupAddress}</p>
                <p><strong>Posted:</strong> ${createdDate ? createdDate.toLocaleDateString() : 'N/A'}</p>
                ${
                  donation.ngoName
                    ? `<p><strong>Accepted by:</strong> ${donation.ngoName}</p>`
                    : ""
                }
            </div>
        </div>
    `;
      }
    )
    .join("");
}

// Render platform activities
function renderPlatformActivities(activities) {
  if (activities.length === 0) {
    platformActivityElement.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-chart-bar"></i>
        <p>No recent activities</p>
      </div>
    `;
    return;
  }

  platformActivityElement.innerHTML = activities
    .map(
      (activity) => {
        const timestamp = activity.timestamp?._seconds 
          ? new Date(activity.timestamp._seconds * 1000)
          : activity.timestamp?.seconds
          ? new Date(activity.timestamp.seconds * 1000)
          : new Date(activity.timestamp);
        
        const timeAgo = getTimeAgo(timestamp);
        
        return `
          <div class="activity-item activity-clickable" onclick="showActivityDetails('${activity.type}', '${activity.relatedId}')">
            <div class="activity-icon" style="background-color: ${activity.color}20; color: ${activity.color}">
              <i class="fas ${activity.icon}"></i>
            </div>
            <div class="activity-content">
              <div class="activity-header">
                <h4 class="activity-title">${activity.title}</h4>
                <span class="activity-time">${timeAgo}</span>
              </div>
              <p class="activity-description">${activity.description}</p>
            </div>
            <div class="activity-arrow">
              <i class="fas fa-chevron-right"></i>
            </div>
          </div>
        `;
      }
    )
    .join("");
}

// Format Firestore timestamp to Date object
function formatFirestoreDate(timestamp) {
  if (!timestamp) return null;
  
  // Handle Firestore timestamp format
  if (timestamp._seconds) {
    return new Date(timestamp._seconds * 1000);
  } else if (timestamp.seconds) {
    return new Date(timestamp.seconds * 1000);
  } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    return new Date(timestamp);
  } else if (timestamp instanceof Date) {
    return timestamp;
  }
  
  return null;
}

// Get time ago string
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  
  return date.toLocaleDateString();
}

// Show activity details
async function showActivityDetails(activityType, relatedId) {
  try {
    // Handle different activity types
    if (activityType.includes('donation')) {
      // For donation-related activities, show donation details
      await showDonationDetails(relatedId);
    } else if (activityType === 'user_registered' || activityType === 'volunteer_registered') {
      // For user registrations, navigate to users view
      window.location.href = '/admin/view-users';
    } else if (activityType === 'ngo_verified') {
      // For NGO verifications, navigate to NGOs view
      window.location.href = '/admin/view-ngos';
    }
  } catch (error) {
    console.error('Failed to show activity details:', error);
    showNotification('Failed to load activity details', 'error');
  }
}

// Get status text
function getStatusText(status) {
  const statusMap = {
    available: "Available",
    matched: "Accepted",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return statusMap[status] || status;
}

// Show NGO verification details
async function showNGOVerification(ngoId) {
  try {
    const response = await fetch(`/api/admin/pending-ngos/${ngoId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (response.ok) {
      const ngo = await response.json();
      currentNGOId = ngoId;

      const submittedDate = formatFirestoreDate(ngo.createdAt);
      
      ngoVerificationDetails.innerHTML = `
                <div class="detail-item">
                    <span class="detail-label">NGO Name:</span>
                    <span class="detail-value">${ngo.name}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Address:</span>
                    <span class="detail-value">${ngo.address}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Contact:</span>
                    <span class="detail-value">${ngo.contact}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Email:</span>
                    <span class="detail-value">${ngo.email}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Registration ID:</span>
                    <span class="detail-value">${ngo.registrationId}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Mission:</span>
                    <span class="detail-value">${
                      ngo.mission || "Not provided"
                    }</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Submitted:</span>
                    <span class="detail-value">${submittedDate ? submittedDate.toLocaleString() : 'N/A'}</span>
                </div>
                ${
                  ngo.documents && ngo.documents.length > 0
                    ? `
                    <div class="detail-item">
                        <span class="detail-label">Documents:</span>
                        <span class="detail-value">
                            ${ngo.documents
                              .map(
                                (doc) => `
                                <a href="${doc.url}" target="_blank" class="document-link">
                                    <i class="fas fa-file"></i> ${doc.name}
                                </a>
                            `
                              )
                              .join("<br>")}
                        </span>
                    </div>
                `
                    : ""
                }
            `;

      showModal("ngoVerificationModal");
    }
  } catch (error) {
    console.error("Failed to load NGO verification details:", error);
    showNotification("Failed to load NGO verification details", "error");
  }
}

// Show donation details
async function showDonationDetails(donationId) {
  try {
    const response = await fetch(`/api/donations/${donationId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (response.ok) {
      const donation = await response.json();

      const postedDate = formatFirestoreDate(donation.createdAt);
      const acceptedDate = formatFirestoreDate(donation.acceptedAt);
      const completedDate = formatFirestoreDate(donation.completedAt);
      
      donationDetails.innerHTML = `
                <div class="detail-item">
                    <span class="detail-label">Item Type:</span>
                    <span class="detail-value">${donation.itemType}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Quantity:</span>
                    <span class="detail-value">${donation.quantity}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Description:</span>
                    <span class="detail-value">${
                      donation.description || "No description"
                    }</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Donor:</span>
                    <span class="detail-value">${donation.donorName}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Pickup Address:</span>
                    <span class="detail-value">${donation.pickupAddress}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Status:</span>
                    <span class="detail-value">${getStatusText(
                      donation.status
                    )}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Posted:</span>
                    <span class="detail-value">${postedDate ? postedDate.toLocaleString() : 'N/A'}</span>
                </div>
                ${
                  donation.ngoName
                    ? `
                    <div class="detail-item">
                        <span class="detail-label">Accepted by:</span>
                        <span class="detail-value">${donation.ngoName}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Accepted on:</span>
                        <span class="detail-value">${acceptedDate ? acceptedDate.toLocaleString() : 'N/A'}</span>
                    </div>
                `
                    : ""
                }
                ${
                  donation.status === "completed"
                    ? `
                    <div class="detail-item">
                        <span class="detail-label">Completed on:</span>
                        <span class="detail-value">${completedDate ? completedDate.toLocaleString() : 'N/A'}</span>
                    </div>
                `
                    : ""
                }
            `;

      showModal("donationModal");
    }
  } catch (error) {
    console.error("Failed to load donation details:", error);
    showNotification("Failed to load donation details", "error");
  }
}

// Approve NGO
async function approveNGO(ngoId = currentNGOId) {
  if (!ngoId) return;

  try {
    const response = await fetch(`/api/admin/verify-ngo/${ngoId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "verified" }),
    });

    if (response.ok) {
      showNotification("NGO approved successfully!", "success");
      closeModal("ngoVerificationModal");
      await loadPendingNGOs();
      await loadPlatformStatistics();
    } else {
      const error = await response.json();
      showNotification(error.message || "Failed to approve NGO", "error");
    }
  } catch (error) {
    console.error("Failed to approve NGO:", error);
    showNotification("Failed to approve NGO", "error");
  }
}

// Reject NGO
async function rejectNGO(ngoId = currentNGOId) {
  if (!ngoId) return;

  try {
    const response = await fetch(`/api/admin/verify-ngo/${ngoId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "rejected" }),
    });

    if (response.ok) {
      showNotification("NGO rejected successfully!", "success");
      closeModal("ngoVerificationModal");
      await loadPendingNGOs();
      await loadPlatformStatistics();
    } else {
      const error = await response.json();
      showNotification(error.message || "Failed to reject NGO", "error");
    }
  } catch (error) {
    console.error("Failed to reject NGO:", error);
    showNotification("Failed to reject NGO", "error");
  }
}

// Setup event listeners
function setupEventListeners() {
  // Refresh statistics
  refreshStatsBtn.addEventListener("click", async () => {
    await loadPlatformStatistics();
    showNotification("Statistics refreshed", "info");
  });

  // Refresh NGOs
  refreshNGOsBtn.addEventListener("click", async () => {
    await loadPendingNGOs();
    showNotification("NGO list refreshed", "info");
  });

  // Refresh donations
  refreshDonationsBtn.addEventListener("click", async () => {
    await loadRecentDonations();
    showNotification("Donations refreshed", "info");
  });

  // Refresh activity
  refreshActivityBtn.addEventListener("click", async () => {
    await loadPlatformActivities();
    showNotification("Activity feed refreshed", "info");
  });

  // Logout button
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  });
}

// Setup Socket.IO listeners
function setupSocketListeners() {
  // New NGO registration notification
  socket.on("new-ngo-registration", (data) => {
    showNotification(`New NGO registration: ${data.name}`, "info");
    loadPendingNGOs();
    loadPlatformStatistics();
  });

  // New donation notification
  socket.on("new-donation", (data) => {
    showNotification(`New donation: ${data.itemType}`, "info");
    loadRecentDonations();
    loadPlatformStatistics();
    loadPlatformActivities();
  });

  // Donation matched notification
  socket.on("donation-matched", (data) => {
    loadPlatformActivities();
  });

  // Donation completed notification
  socket.on("donation-completed", (data) => {
    loadPlatformActivities();
  });

  // Donation cancelled notification
  socket.on("donation-cancelled", (data) => {
    loadPlatformActivities();
  });

  // User registered notification
  socket.on("user-registered", (data) => {
    loadPlatformActivities();
  });
}

// Password toggle helper for admin page
function initPasswordToggles() {
  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
      const wrapper = btn.closest('.password-wrapper');
      if (!wrapper) return;
      const input = wrapper.querySelector('input[type="password"], input[type="text"]');
      if (!input) return;

      if (input.type === 'password') {
        input.type = 'text';
        btn.setAttribute('aria-label', 'Hide password');
        const icon = btn.querySelector('i');
        if (icon) { icon.classList.remove('fa-eye'); icon.classList.add('fa-eye-slash'); }
      } else {
        input.type = 'password';
        btn.setAttribute('aria-label', 'Show password');
        const icon = btn.querySelector('i');
        if (icon) { icon.classList.remove('fa-eye-slash'); icon.classList.add('fa-eye'); }
      }
    });
  });
}

// Utility functions
function showModal(modalId) {
  document.getElementById(modalId).classList.remove("hidden");
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.add("hidden");
  if (modalId === "ngoVerificationModal") {
    currentNGOId = null;
  }
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

// Add some additional CSS for admin-specific elements
const additionalStyles = `
    .stat-clickable {
        cursor: pointer;
        transition: all 0.3s ease;
    }
    
    .stat-clickable:hover {
        transform: scale(1.1) translateY(-5px);
        box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
    }
    
    .stat-hint {
        font-size: 0.75rem;
        opacity: 0;
        margin-top: 0.25rem;
        transition: opacity 0.3s ease;
    }
    
    .stat-clickable:hover .stat-hint {
        opacity: 0.9;
    }
    
    .ngo-item {
        background: #f8f9fa;
        border-radius: 10px;
        padding: 1rem;
        margin-bottom: 1rem;
        border-left: 4px solid #ff6b6b;
        transition: all 0.3s ease;
        cursor: pointer;
    }
    
    .ngo-item:hover {
        background: #e9ecef;
        transform: translateX(5px);
    }
    
    .ngo-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 0.5rem;
    }
    
    .ngo-title {
        font-weight: 600;
        color: #2d3748;
        margin: 0;
    }
    
    .ngo-date {
        background: #667eea;
        color: white;
        padding: 0.25rem 0.5rem;
        border-radius: 15px;
        font-size: 0.8rem;
        font-weight: 500;
    }
    
    .ngo-details {
        color: #4a5568;
        font-size: 0.9rem;
        margin-bottom: 0.5rem;
    }
    
    .ngo-actions {
        display: flex;
        gap: 0.5rem;
        margin-top: 0.5rem;
    }
    
    .donation-status {
        padding: 0.25rem 0.5rem;
        border-radius: 15px;
        font-size: 0.8rem;
        font-weight: 500;
    }
    
    .donation-status.available {
        background: #667eea;
        color: white;
    }
    
    .donation-status.matched {
        background: #00b894;
        color: white;
    }
    
    .donation-status.completed {
        background: #6c757d;
        color: white;
    }
    
    .donation-status.cancelled {
        background: #ff6b6b;
        color: white;
    }
    
    .ngo-verification-details {
        padding: 1.5rem;
        max-height: 400px;
        overflow-y: auto;
    }
    
    .document-link {
        color: #667eea;
        text-decoration: none;
        display: inline-block;
        margin: 0.25rem 0;
        padding: 0.25rem 0.5rem;
        background: #f8f9fa;
        border-radius: 5px;
        transition: background 0.3s ease;
    }
    
    .document-link:hover {
        background: #e9ecef;
        text-decoration: none;
    }
    
    .activity-list {
        max-height: 400px;
        overflow-y: auto;
    }
    
    .activity-item {
        display: flex;
        gap: 1rem;
        padding: 1rem;
        border-bottom: 1px solid #e2e8f0;
        transition: all 0.2s ease;
    }
    
    .activity-item:hover {
        background: #f7fafc;
    }
    
    .activity-clickable {
        cursor: pointer;
    }
    
    .activity-clickable:hover {
        background: #edf2f7;
        transform: translateX(4px);
    }
    
    .activity-arrow {
        display: flex;
        align-items: center;
        color: #a0aec0;
        opacity: 0;
        transition: opacity 0.2s ease;
    }
    
    .activity-clickable:hover .activity-arrow {
        opacity: 1;
    }
    
    .activity-item:last-child {
        border-bottom: none;
    }
    
    .activity-icon {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.2rem;
        flex-shrink: 0;
    }
    
    .activity-content {
        flex: 1;
        min-width: 0;
    }
    
    .activity-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 0.25rem;
        gap: 0.5rem;
    }
    
    .activity-title {
        font-size: 0.95rem;
        font-weight: 600;
        color: #2d3748;
        margin: 0;
    }
    
    .activity-time {
        font-size: 0.75rem;
        color: #a0aec0;
        white-space: nowrap;
    }
    
    .activity-description {
        font-size: 0.85rem;
        color: #4a5568;
        margin: 0;
        overflow: hidden;
        text-overflow: ellipsis;
    }
`;

// Inject additional styles
const styleSheet = document.createElement("style");
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);
