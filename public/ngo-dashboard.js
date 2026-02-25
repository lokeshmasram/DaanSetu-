// ============================================================================
// PERMANENT FIX FOR NGO PENDING VERIFICATION MESSAGE
// ============================================================================

// Immediately hide the status banner on page load to prevent any flash
(function() {
  'use strict';
  
  // Function to completely hide the status banner
  function hideStatusBanner() {
    const statusBanner = document.getElementById('statusBanner');
    if (statusBanner) {
      statusBanner.style.display = 'none';
      statusBanner.classList.add('hidden');
      console.log('✅ Status banner hidden immediately');
    }
  }
  
  // Hide as soon as possible
  hideStatusBanner();
  
  // Also hide after a short delay to override any other scripts
  setTimeout(hideStatusBanner, 100);
  setTimeout(hideStatusBanner, 500);
  setTimeout(hideStatusBanner, 1000);
  
  // Use MutationObserver to catch any dynamically added banners
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1) { // Element node
            if (node.id === 'statusBanner' || 
                (node.classList && node.classList.contains('status-banner'))) {
              // Only hide if it's the initial pending verification message
              if (!window.verificationNotificationReceived) {
                node.style.display = 'none';
                node.classList.add('hidden');
                console.log('✅ Dynamically added status banner hidden');
              }
            }
            
            // Also check children
            const banners = node.querySelectorAll ? 
              node.querySelectorAll('#statusBanner, .status-banner') : [];
            banners.forEach(function(banner) {
              // Only hide if it's the initial pending verification message
              if (!window.verificationNotificationReceived) {
                banner.style.display = 'none';
                banner.classList.add('hidden');
                console.log('✅ Child status banner hidden');
              }
            });
          }
        });
      }
    });
  });
  
  // Start observing
  observer.observe(document.body, { childList: true, subtree: true });
  
  console.log('✅ NGO Status Banner Protection initialized');
})();

// ============================================================================
// ULTIMATE NGO STATUS BANNER PROTECTION (Clean Version)
// This will completely prevent the red/pending banner from appearing for new NGOs
// ============================================================================

(function() {
  'use strict';
  
  // Function to completely destroy any status banner elements
  function destroyStatusBanner() {
    try {
      // Get the main status banner
      const statusBanner = document.getElementById('statusBanner');
      if (statusBanner && !window.verificationNotificationReceived) {
        // Completely hide the element only if we haven't received a verification notification
        statusBanner.style.display = 'none';
        statusBanner.style.visibility = 'hidden';
        statusBanner.style.opacity = '0';
        statusBanner.style.height = '0';
        statusBanner.style.overflow = 'hidden';
        statusBanner.style.position = 'absolute';
        statusBanner.style.left = '-9999px';
        statusBanner.classList.add('hidden');
      }
    } catch (e) {
      console.error('Error destroying status banner:', e);
    }
  }
  
  // Apply protection multiple times to override any other scripts
  function applyProtection() {
    destroyStatusBanner();
    setTimeout(destroyStatusBanner, 100);
    setTimeout(destroyStatusBanner, 500);
    setTimeout(destroyStatusBanner, 1000);
  }
  
  // Start protection immediately
  applyProtection();
  
  // Also apply when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyProtection);
  }
  
  console.log('🛡️ NGO Status Banner Protection Activated');
})();

// Initialize Socket.IO
const socket = io();

// Global variables
let currentUser = null;
let ngoData = null;
let ngoMap = null;
let ngoMarker = null;

// DOM elements
const ngoNameElement = document.getElementById("ngoName");
const statusBanner = document.getElementById("statusBanner");
const statusMessage = document.getElementById("statusMessage");
const donationsList = document.getElementById("donationsList");
const acceptedDonations = document.getElementById("acceptedDonations");
const volunteerTasks = document.getElementById("volunteerTasks");
const refreshDonationsBtn = document.getElementById("refreshDonations");
const createTaskBtn = document.getElementById("createTaskBtn");
const logoutBtn = document.getElementById("logoutBtn");
const createTaskModal = document.getElementById("createTaskModal");
const createTaskForm = document.getElementById("createTaskForm");
const donationModal = document.getElementById("donationModal");
const donationDetails = document.getElementById("donationDetails");
const notificationToast = document.getElementById("notificationToast");
const toastMessage = document.getElementById("toastMessage");
const updateLocationBtn = document.getElementById("updateLocationBtn");
const updateLocationModal = document.getElementById("updateLocationModal");

// Statistics elements
const totalAcceptedElement = document.getElementById("totalAccepted");
const totalCompletedElement = document.getElementById("totalCompleted");
const pendingPickupElement = document.getElementById("pendingPickup");

// Initialize dashboard
document.addEventListener("DOMContentLoaded", async () => {
  await checkAuth();
  await loadNGOData();
  await loadAvailableDonations();
  await loadAcceptedDonations();
  await loadVolunteerTasks();
  await updateStatistics();
  setupEventListeners();
  setupSocketListeners();
});

// Check authentication
async function checkAuth() {
  console.log("🔐 Checking authentication...");
  const token = localStorage.getItem("token");
  if (!token) {
    console.log("❌ No token found, redirecting to login");
    window.location.href = "/";
    return;
  }

  try {
    console.log("📡 Fetching user profile...");
    const response = await fetch("/api/auth/profile", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.log("❌ Profile fetch failed:", response.status);
      showNotification("Session expired, please log in again.", "error");
      setTimeout(() => {
        localStorage.removeItem("token");
        window.location.href = "/";
      }, 2000);
      return;
    }

    const result = await response.json();
    currentUser = result.user;
    console.log("✅ User authenticated:", currentUser.userType);

    if (currentUser.userType !== "ngo") {
      console.log("❌ Not an NGO user");
      showNotification("Unauthorized access. Please log in as NGO.", "error");
      setTimeout(() => {
        localStorage.removeItem("token");
        window.location.href = "/";
      }, 2000);
      return;
    }
  } catch (error) {
    console.error("❌ Auth check error:", error);
    showNotification("Session expired, please log in again.", "error");
    setTimeout(() => {
      localStorage.removeItem("token");
      window.location.href = "/";
    }, 2000);
  }
}

// Load NGO data
async function loadNGOData() {
  console.log("📋 Loading NGO data...");
  try {
    const response = await fetch("/api/ngos/status", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (response.ok) {
      const result = await response.json();
      ngoData = result.ngo;
      ngoData.status = result.status;
      ngoData.id = currentUser.uid;
      ngoNameElement.textContent = ngoData.name;
      
      console.log("✅ NGO data loaded:", {
        name: ngoData.name,
        status: ngoData.status,
        hasCoordinates: !!ngoData.coordinates
      });

      // ULTIMATE PROTECTION: Always keep the status banner completely hidden
      // This completely prevents any flash of banners for new NGOs
      // BUT only if we haven't received a verification notification
      if (statusBanner && !window.verificationNotificationReceived) {
        statusBanner.classList.add("hidden");
        statusBanner.style.display = 'none';
        statusBanner.style.visibility = 'hidden';
        statusBanner.style.opacity = '0';
        statusBanner.style.height = '0';
        statusBanner.style.overflow = 'hidden';
        statusBanner.style.position = 'absolute';
        statusBanner.style.left = '-9999px';
      }
      
      // NEVER show any banners for any status to prevent flash for new NGOs
      // The only exception would be for explicitly rejected NGOs after verification
      // But even then, we keep it minimal
      
      // Join NGO room for real-time notifications
      console.log("🔌 Joining NGO room:", ngoData.id);
      socket.emit("join-ngo-room", ngoData.id);
    } else {
      const error = await response.json();
      console.error("❌ Failed to load NGO data:", error);
      showNotification(error.message || "Failed to load NGO data", "error");
    }
  } catch (error) {
    console.error("❌ Exception loading NGO data:", error);
    showNotification("Failed to load NGO data", "error");
  }
}

// Initialize NGO map for location selection
async function initializeNgoMap() {
  const mapContainer = document.getElementById("ngoMap");
  if (!mapContainer) {
    console.error("NGO map container not found");
    return;
  }
  
  // Don't reinitialize if already done
  if (ngoMap) return;

  // Wait for Google Maps to load (max 10 seconds)
  console.log("Waiting for Google Maps to load...");
  let attempts = 0;
  const maxAttempts = 20; // 20 attempts * 500ms = 10 seconds
  
  while (attempts < maxAttempts) {
    if (typeof google !== "undefined" && google.maps) {
      console.log("✅ Google Maps loaded successfully");
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
    attempts++;
  }
  
  // Check if Google Maps loaded
  if (typeof google === "undefined" || !google.maps) {
    console.error("Failed to load Google Maps after waiting");
    showNgoMapFallback(mapContainer);
    return;
  }

  // Clear map container before initializing
  mapContainer.innerHTML = '';

  // Default location (center of India)
  const defaultLocation = { lat: 20.5937, lng: 78.9629 };

  ngoMap = new google.maps.Map(mapContainer, {
    zoom: 12,
    center: defaultLocation,
    mapTypeControl: true,
    fullscreenControl: true,
    streetViewControl: false,
  });

  // Add click listener to map to set marker
  ngoMap.addListener("click", (e) => {
    setNgoMarker(e.latLng);
  });

  // If NGO already has coordinates, set the marker
  if (ngoData && ngoData.coordinates) {
    const latlng = {
      lat: ngoData.coordinates.lat,
      lng: ngoData.coordinates.lng,
    };
    setNgoMarker(latlng);
    ngoMap.setCenter(latlng);
    ngoMap.setZoom(15);
  }

  // Add clear location button event
  document
    .getElementById("clearNgoLocation")
    ?.addEventListener("click", clearNgoLocation);

  // Add save location button event
  document
    .getElementById("saveNgoLocation")
    ?.addEventListener("click", saveNgoLocation);
}

// Set marker on the NGO map
function setNgoMarker(latlng) {
  if (!ngoMap) return;

  // Accept either google.maps.LatLng with lat()/lng() or plain {lat, lng} numbers
  let pos;
  if (latlng && typeof latlng.lat === "function" && typeof latlng.lng === "function") {
    pos = latlng;
  } else if (latlng && (typeof latlng.lat === "number" || typeof latlng.lat === "string")) {
    pos = new google.maps.LatLng(Number(latlng.lat), Number(latlng.lng));
  } else {
    console.warn("setNgoMarker: invalid latlng", latlng);
    return;
  }

  // Remove existing marker if any
  if (ngoMarker) {
    ngoMarker.setMap(null);
  }

  // Add new marker
  ngoMarker = new google.maps.Marker({
    position: pos,
    map: ngoMap,
    title: "NGO Location",
  });

  // Update location input (support both LatLng and plain objects)
  try {
    const latVal = typeof pos.lat === "function" ? pos.lat() : pos.lat;
    const lngVal = typeof pos.lng === "function" ? pos.lng() : pos.lng;
    document.getElementById("ngoLocationInput").value = `${Number(latVal).toFixed(4)}, ${Number(lngVal).toFixed(4)}`;
  } catch (e) {
    console.warn("Could not update location input", e);
  }

  // Update the map view to center on the marker
  ngoMap.setCenter(pos);
  ngoMap.setZoom(15);
}

// Clear NGO location marker
function clearNgoLocation() {
  if (ngoMarker) {
    ngoMarker.setMap(null);
    ngoMarker = null;
  }
  // Clear location input
  document.getElementById("ngoLocationInput").value = "";
}

// Fallback UI when Google Maps is not available for NGO
function showNgoMapFallback(container) {
  container.innerHTML = `
    <div style="padding: 20px; background: #f5f5f5; border-radius: 8px; border: 1px solid #ddd;">
      <p style="color: #666; margin-bottom: 16px; font-size: 14px;">
        <strong>Map unavailable</strong> - Enter your NGO location coordinates below:
      </p>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
        <div>
          <label style="display: block; font-size: 13px; color: #333; margin-bottom: 6px;">Latitude</label>
          <input 
            id="fallback-ngo-latitude" 
            type="number" 
            placeholder="e.g., 28.6139" 
            step="0.0001"
            style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;"
          />
        </div>
        <div>
          <label style="display: block; font-size: 13px; color: #333; margin-bottom: 6px;">Longitude</label>
          <input 
            id="fallback-ngo-longitude" 
            type="number" 
            placeholder="e.g., 77.2090" 
            step="0.0001"
            style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;"
          />
        </div>
      </div>
      <button 
        onclick="setFallbackNgoLocation()"
        style="width: 100%; padding: 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;"
      >
        Set Location
      </button>
      <p style="font-size: 12px; color: #999; margin-top: 12px; margin-bottom: 0;">
        💡 Use a <a href="https://www.google.com/maps" target="_blank" style="color: #1976d2; text-decoration: none;">map service</a> to find coordinates for your location
      </p>
    </div>
  `;
}

// Set NGO location from fallback coordinate inputs
function setFallbackNgoLocation() {
  const lat = document.getElementById('fallback-ngo-latitude')?.value;
  const lng = document.getElementById('fallback-ngo-longitude')?.value;
  
  if (!lat || !lng) {
    alert('Please enter both latitude and longitude');
    return;
  }
  
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  
  if (isNaN(latNum) || isNaN(lngNum)) {
    alert('Please enter valid numbers for coordinates');
    return;
  }
  
  // Update the location field (same as map version)
  document.getElementById('ngoLocationInput').value = `${latNum.toFixed(4)}, ${lngNum.toFixed(4)}`;
  showNotification('NGO location set to: ' + document.getElementById('ngoLocationInput').value, 'success');
}

// Save NGO location
async function saveNgoLocation() {
  try {
    // Get the location from the input field (works with both map and fallback)
    const locationInput = document.getElementById("ngoLocationInput");
    const locationValue = locationInput?.value?.trim();

    if (!locationValue) {
      showNotification("Please set a location first", "error");
      return;
    }

    // Parse coordinates from location string (format: "lat, lng")
    const [latStr, lngStr] = locationValue.split(",").map(s => s.trim());
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    if (isNaN(lat) || isNaN(lng)) {
      showNotification("Invalid location format", "error");
      return;
    }

    const coordinates = { lat, lng };

    const response = await fetch("/api/ngos/coordinates", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ coordinates }),
    });

    if (response.ok) {
      showNotification("Location updated successfully!", "success");
      closeModal("updateLocationModal");
      // Refresh NGO data to get the updated coordinates
      await loadNGOData();
      // Refresh available donations since location has changed
      await loadAvailableDonations();
    } else {
      const error = await response.json();
      showNotification(error.message || "Failed to update location", "error");
    }
  } catch (error) {
    console.error("Failed to update location:", error);
    showNotification("Failed to update location", "error");
  }
}

// Setup event listeners
function setupEventListeners() {
  // Refresh donations
  refreshDonationsBtn.addEventListener("click", loadAvailableDonations);

  // Create task button - disable if NGO is not verified
  createTaskBtn.addEventListener("click", () => {
    if (ngoData && ngoData.status === "verified") {
      showModal("createTaskModal");
    } else if (ngoData && ngoData.status === "pending_verification") {
      showNotification("Cannot create volunteer tasks while verification is pending. Please wait for verification.", "info");
    } else {
      showNotification("Your NGO account is not verified. Please contact support.", "error");
    }
  });

  // Update location button
  updateLocationBtn.addEventListener("click", () => showModal("updateLocationModal"));

  // Logout button
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  });

  // Create task form
  createTaskForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(createTaskForm);
    const taskData = {
      title: formData.get("title"),
      description: formData.get("description"),
      location: formData.get("location"),
      date: formData.get("date"),
      type: formData.get("type"),
    };

    try {
      const response = await fetch("/api/volunteers/create-task", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(taskData),
      });

      if (response.ok) {
        showNotification("Volunteer task created successfully!", "success");
        closeModal("createTaskModal");
        createTaskForm.reset();
        await loadVolunteerTasks();
      } else {
        const error = await response.json();
        showNotification(error.message || "Failed to create task", "error");
      }
    } catch (error) {
      console.error("Failed to create task:", error);
      showNotification("Failed to create task", "error");
    }
  });
}

// Setup Socket.IO listeners
function setupSocketListeners() {
  // New donation notification
  socket.on("new-donation", (donation) => {
    showNotification(`New donation available: ${donation.itemType}`, "info");
    loadAvailableDonations();
  });

  // Donation accepted notification
  socket.on("donation-accepted", (data) => {
    showNotification(`Donation accepted by ${data.ngoName}`, "info");
    loadAvailableDonations();
  });

  // Task assigned notification
  socket.on("task-assigned", (data) => {
    showNotification(`Volunteer assigned to task: ${data.message}`, "success");
    loadVolunteerTasks();
  });

  // Task completed notification
  socket.on("task-completed", (data) => {
    showNotification(`Task completed: ${data.message}`, "success");
    loadVolunteerTasks();
  });

  // Donation completed notification
  socket.on("donation-completed", (data) => {
    showNotification(data.message, "success");
    loadAcceptedDonations();
    updateStatistics();
  });

  // Donation picked up notification
  socket.on("donation-picked-up", (data) => {
    showNotification(
      `Donor has marked donation as picked up: ${data.message}`,
      "info"
    );
    loadAcceptedDonations();
    updateStatistics();
  });

  // NGO verification rejected - show prominent red message with reasons
  socket.on('ngo-rejected', (data) => {
    try {
      // Mark that we've received a verification notification
      window.verificationNotificationReceived = true;
      
      const reasons = data.reasons || '';
      statusBanner.classList.remove('hidden');
      statusBanner.classList.remove('info');
      statusBanner.classList.add('error');
      statusMessage.innerHTML = `Your (${ngoData?.name || 'NGO'}) verification request has been denied due to the reason: <strong style="color:#8b0000">${reasons}</strong>`;
      showNotification('Your verification request was rejected by admin', 'error');
    } catch (err) {
      console.error('Error handling ngo-rejected socket:', err);
    }
  });

  // NGO verification successful - show success message that disappears after 8 seconds
  socket.on('ngo-verified', (data) => {
    try {
      // Mark that we've received a verification notification
      window.verificationNotificationReceived = true;
      
      // Show success notification
      showNotification(`The verification of ${ngoData?.name || 'your NGO'} is successful`, 'success', 8000);
      
      // Also show in status banner temporarily
      statusBanner.classList.remove('hidden');
      statusBanner.classList.remove('error');
      statusBanner.classList.add('success'); // Use success class for green background
      statusMessage.textContent = `The verification of ${ngoData?.name || 'your NGO'} is successful`;
      
      // Hide the message after 8 seconds
      setTimeout(() => {
        statusBanner.classList.add('hidden');
        // Refresh NGO data to update status
        loadNGOData();
      }, 8000);
    } catch (err) {
      console.error('Error handling ngo-verified socket:', err);
    }
  });

  // Volunteer completed pickup task notification
  socket.on("donation-volunteer-completed", (data) => {
    showNotification(data.message, "success");
    loadAcceptedDonations();
    updateStatistics();
  });
}

// Utility functions
function showModal(modalId) {
  document.getElementById(modalId).classList.remove("hidden");
  
  // Initialize NGO location map if opening the location modal
  if (modalId === "updateLocationModal") {
    setTimeout(async () => {
      await initializeNgoMap();
    }, 300);
  }
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.add("hidden");
  
  // Reset NGO map when closing the location modal
  if (modalId === "updateLocationModal") {
    if (ngoMap) {
      ngoMap = null;
    }
    if (ngoMarker) {
      ngoMarker = null;
    }
  }
}

function showNotification(message, type = "info", timeout = 5000) {
  toastMessage.textContent = message;
  notificationToast.className = `notification-toast ${type}`;
  notificationToast.classList.remove("hidden");

  setTimeout(() => {
    notificationToast.classList.add("hidden");
  }, timeout);
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

// Create volunteer task with donation linking
async function createVolunteerTask(taskData, donationId = null) {
  try {
    // Add donation ID to task data if provided
    if (donationId) {
      taskData.donationId = donationId;
    }

    const response = await fetch("/api/volunteers/create-task", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(taskData),
    });

    if (response.ok) {
      showNotification("Volunteer task created successfully!", "success");
      closeModal("createTaskModal");
      createTaskForm.reset();
      await loadVolunteerTasks();
    } else {
      const error = await response.json();
      showNotification(error.message || "Failed to create task", "error");
    }
  } catch (error) {
    console.error("Failed to create task:", error);
    showNotification("Failed to create task", "error");
  }
}

// Load available donations
async function loadAvailableDonations() {
  try {
    console.log("🔄 Loading available donations...");
    const response = await fetch("/api/donations/available", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    console.log("📡 Available donations API response:", response.status);

    if (response.ok) {
      const result = await response.json();
      console.log("✅ Available donations received:", result.donations?.length || 0);
      console.log("📋 Donations data:", result.donations);
      renderDonationsList(result.donations || []);
    } else {
      const error = await response.json();
      console.error("❌ Failed to load donations:", error);
      showNotification(error.message || "Failed to load donations", "error");
      donationsList.innerHTML =
        '<div class="error">Failed to load donations</div>';
    }
  } catch (error) {
    console.error("❌ Exception loading donations:", error);
    showNotification("Failed to load donations", "error");
    donationsList.innerHTML =
      '<div class="error">Failed to load donations</div>';
  }
}

// Load accepted donations
async function loadAcceptedDonations() {
  try {
    console.log("📋 Loading accepted donations...");
    const response = await fetch("/api/donations/history", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (response.ok) {
      const result = await response.json();
      console.log("📦 History API returned:", result.donations?.length || 0, "donations");
      const accepted = (result.donations || []).filter(
        (donation) =>
          donation.status === "accepted" || donation.status === "completed"
      );
      console.log("✅ Filtered accepted donations:", accepted.length, "donations");
      console.log("📊 Statuses:", accepted.map(d => d.status));
      renderAcceptedDonations(accepted);
    } else {
      const error = await response.json();
      showNotification(
        error.message || "Failed to load accepted donations",
        "error"
      );
      acceptedDonations.innerHTML =
        '<div class="error">Failed to load accepted donations</div>';
    }
  } catch (error) {
    console.error("Failed to load accepted donations:", error);
    showNotification("Failed to load accepted donations", "error");
    acceptedDonations.innerHTML =
      '<div class="error">Failed to load accepted donations</div>';
  }
}

// Load volunteer tasks
async function loadVolunteerTasks() {
  try {
    const response = await fetch("/api/volunteers/tasks/ngo", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (response.ok) {
      const result = await response.json();
      renderVolunteerTasks(result.tasks || []);
    } else {
      const error = await response.json();
      showNotification(
        error.message || "Failed to load volunteer tasks",
        "error"
      );
      volunteerTasks.innerHTML =
        '<div class="error">Failed to load volunteer tasks</div>';
    }
  } catch (error) {
    console.error("Failed to load volunteer tasks:", error);
    showNotification("Failed to load volunteer tasks", "error");
    volunteerTasks.innerHTML =
      '<div class="error">Failed to load volunteer tasks</div>';
  }
}

// Update statistics
async function updateStatistics() {
  try {
    const response = await fetch("/api/donations/history", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (response.ok) {
      const result = await response.json();
      const history = result.donations || [];

      const totalAccepted = history.filter(
        (d) => d.status === "accepted" || d.status === "completed"
      ).length;
      const totalCompleted = history.filter(
        (d) => d.status === "completed"
      ).length;
      const pendingPickup = history.filter(
        (d) => d.status === "accepted"
      ).length;

      totalAcceptedElement.textContent = totalAccepted;
      totalCompletedElement.textContent = totalCompleted;
      pendingPickupElement.textContent = pendingPickup;
    } else {
      const error = await response.json();
      showNotification(error.message || "Failed to update statistics", "error");
    }
  } catch (error) {
    console.error("Failed to update statistics:", error);
    showNotification("Failed to update statistics", "error");
  }
}

// Render donations list
function renderDonationsList(donations) {
  console.log("🎨 Rendering donations list:", donations.length, "donations");
  console.log("📦 NGO Status:", ngoData?.status);
  
  if (donations.length === 0) {
    console.log("⚠️ No donations to display");
    donationsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-gift"></i>
                <p>No available donations in your area</p>
            </div>
        `;
    return;
  }

  console.log("✅ Rendering", donations.length, "donation items");
  donationsList.innerHTML = donations
    .map(
      (donation) => `
        <div class="donation-item" onclick="showDonationDetails('${
          donation.id
        }')">
            <div class="donation-header">
                <h4 class="donation-title">${donation.itemType} - ${
        donation.quantity
      }</h4>
                <span class="donation-distance">${
                  donation.distance ? donation.distance.toFixed(1) : "N/A"
                } km</span>
            </div>
            <div class="donation-details">
                <p><strong>Location:</strong> ${donation.pickupAddress}</p>
                <p><strong>Description:</strong> ${
                  donation.description || "No description"
                }</p>
                <p><strong>Posted:</strong> ${
                  donation.createdAt
                    ? new Date(
                        donation.createdAt._seconds * 1000
                      ).toLocaleDateString()
                    : "N/A"
                }</p>
            </div>
            ${
              ngoData && ngoData.status === "verified"
                ? `
                <div class="donation-actions">
                    <button class="btn-success" onclick="event.stopPropagation(); acceptDonation('${donation.id}')">
                        Accept Donation
                    </button>
                </div>
            `
                : ngoData && ngoData.status === "pending_verification"
                ? `
                <div class="donation-actions">
                    <button class="btn-secondary" disabled title="Cannot accept donations while verification is pending">
                        Verification Pending
                    </button>
                </div>
                `
                : ""
            }
        </div>
    `
    )
    .join("");
}

// Render accepted donations
function renderAcceptedDonations(donations) {
  if (donations.length === 0) {
    acceptedDonations.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>No accepted donations yet</p>
            </div>
        `;
    return;
  }

  acceptedDonations.innerHTML = donations
    .map((donation) => {
      // For donations with pickup tasks, only show "Mark Complete" button if volunteer task is completed
      let showCompleteButton =
        donation.status === "accepted" && !donation.hasPickupTask;
      let showAwaitingMessage =
        donation.status === "accepted" &&
        donation.hasPickupTask &&
        !donation.volunteerTaskCompleted;

      return `
        <div class="donation-item ${
          donation.status
        }" onclick="showDonationDetails('${donation.id}')">
            <div class="donation-header">
                <h4 class="donation-title">${donation.itemType} - ${
        donation.quantity
      }</h4>
                <span class="donation-status ${donation.status}">${
        donation.status
      }</span>
            </div>
            <div class="donation-details">
                <p><strong>Donor:</strong> ${donation.donorName || "N/A"}</p>
                <p><strong>Donor Phone:</strong> ${
                  donation.donorPhone || "N/A"
                }</p>
                <p><strong>Posted:</strong> ${
                  donation.createdAt
                    ? new Date(
                        donation.createdAt._seconds * 1000
                      ).toLocaleDateString()
                    : "N/A"
                }</p>
                ${
                  donation.acceptedAt
                    ? `<p><strong>Accepted:</strong> ${new Date(
                        donation.acceptedAt._seconds * 1000
                      ).toLocaleDateString()}</p>`
                    : ""
                }
                ${
                  donation.hasPickupTask && donation.status === "accepted"
                    ? `<p><strong>Volunteer Task:</strong> ${
                        donation.volunteerTaskCompleted
                          ? "Completed"
                          : "In Progress"
                      }</p>`
                    : ""
                }
            </div>
            ${
              showCompleteButton
                ? `
                <div class="donation-actions">
                    <button class="btn-success" onclick="event.stopPropagation(); completeDonation('${donation.id}')">
                        Mark Complete
                    </button>
                </div>
            `
                : showAwaitingMessage
                ? `
                <div class="donation-actions">
                    <button class="btn-secondary" disabled>
                        Awaiting Volunteer Completion
                    </button>
                </div>
                `
                : ""
            }
        </div>
    `;
    })
    .join("");
}

// Render volunteer tasks
function renderVolunteerTasks(tasks) {
  if (tasks.length === 0) {
    volunteerTasks.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tasks"></i>
                <p>No volunteer tasks created</p>
            </div>
        `;
    return;
  }

  volunteerTasks.innerHTML = tasks
    .map(
      (task) => `
        <div class="task-item">
            <div class="task-header">
                <h4 class="task-title">${task.title}</h4>
                <span class="task-status ${task.status}">${task.status}</span>
            </div>
            <div class="task-details">
                <p><strong>Type:</strong> ${task.type}</p>
                <p><strong>Location:</strong> ${task.location}</p>
                <p><strong>Date:</strong> ${new Date(
                  task.date
                ).toLocaleDateString()}</p>
                <p><strong>Description:</strong> ${task.description}</p>
            </div>
        </div>
    `
    )
    .join("");
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
                    <span class="detail-label">Pickup Address:</span>
                    <span class="detail-value">${donation.pickupAddress}</span>
                </div>
                ${
                  donation.coordinates
                    ? `
                <div class="detail-item">
                    <span class="detail-label">Coordinates:</span>
                    <span class="detail-value">${donation.coordinates.lat}, ${donation.coordinates.lng}</span>
                </div>
                `
                    : ""
                }
                <div class="detail-item">
                    <span class="detail-label">Posted:</span>
                    <span class="detail-value">${
                      donation.createdAt
                        ? new Date(
                            donation.createdAt._seconds * 1000
                          ).toLocaleString()
                        : "N/A"
                    }</span>
                </div>
                ${
                  donation.status === "matched"
                    ? `
                    <div class="detail-item">
                        <span class="detail-label">Donor Name:</span>
                        <span class="detail-value">${donation.donorName}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Donor Phone:</span>
                        <span class="detail-value">${donation.donorPhone}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Matched At:</span>
                        <span class="detail-value">${
                          donation.matchedAt
                            ? new Date(
                                donation.matchedAt._seconds * 1000
                              ).toLocaleString()
                            : "N/A"
                        }</span>
                    </div>
                    ${
                      donation.hasPickupTask
                        ? `
                        <div class="detail-info" style="margin-top: 1rem; padding: 1rem; background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px;">
                            <p><strong>Notice:</strong> This donation requires volunteer pickup. The "Mark Complete" button will be available after the volunteer completes their task.</p>
                        </div>
                        `
                        : `
                        <div class="detail-actions" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #eee;">
                            <button class="btn-success" onclick="completeDonation('${donation.id}')" style="width: 100%;">
                                Mark Complete
                            </button>
                        </div>
                        `
                    }
                `
                    : ""
                }
                ${
                  donation.status === "picked_up"
                    ? `
                    <div class="detail-item">
                        <span class="detail-label">Donor Name:</span>
                        <span class="detail-value">${donation.donorName}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Donor Phone:</span>
                        <span class="detail-value">${donation.donorPhone}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Picked Up At:</span>
                        <span class="detail-value">${
                          donation.pickedUpAt
                            ? new Date(
                                donation.pickedUpAt._seconds * 1000
                              ).toLocaleString()
                            : "N/A"
                        }</span>
                    </div>
                    <div class="detail-actions" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #eee;">
                        <button class="btn-success" onclick="markDonationReceived('${
                          donation.id
                        }')" style="width: 100%;">
                            Mark as Received
                        </button>
                    </div>
                `
                    : ""
                }
                ${
                  donation.status === "completed"
                    ? `
                    <div class="detail-item">
                        <span class="detail-label">Donor Name:</span>
                        <span class="detail-value">${donation.donorName}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Donor Phone:</span>
                        <span class="detail-value">${donation.donorPhone}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Completed At:</span>
                        <span class="detail-value">${
                          donation.completedAt
                            ? new Date(
                                donation.completedAt._seconds * 1000
                              ).toLocaleString()
                            : "N/A"
                        }</span>
                    </div>
                `
                    : ""
                }
            `;

      showModal("donationModal");
    } else {
      const error = await response.json();
      showNotification(
        error.message || "Failed to load donation details",
        "error"
      );
    }
  } catch (error) {
    console.error("Failed to load donation details:", error);
    showNotification("Failed to load donation details", "error");
  }
}

// Accept donation
async function acceptDonation(donationId) {
  try {
    console.log("🎯 Accepting donation:", donationId);
    const response = await fetch(`/api/donations/${donationId}/accept`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const result = await response.json();
      console.log("✅ Donation accepted successfully:", result);
      showNotification("Donation accepted successfully!", "success");
      
      // Reload all relevant sections
      console.log("🔄 Reloading available donations...");
      await loadAvailableDonations();
      console.log("🔄 Reloading accepted donations...");
      await loadAcceptedDonations();
      console.log("🔄 Updating statistics...");
      await updateStatistics();
      console.log("✅ All sections updated successfully");
    } else {
      const error = await response.json();
      console.error("❌ Failed to accept donation:", error);
      showNotification(error.message || "Failed to accept donation", "error");
    }
  } catch (error) {
    console.error("❌ Exception accepting donation:", error);
    showNotification("Failed to accept donation", "error");
  }
}

// Complete donation
async function completeDonation(donationId) {
  try {
    const response = await fetch(`/api/donations/${donationId}/complete`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      showNotification("Donation marked as completed!", "success");
      await loadAcceptedDonations();
      await updateStatistics();
    } else {
      const error = await response.json();
      showNotification(error.message || "Failed to complete donation", "error");
    }
  } catch (error) {
    console.error("Failed to complete donation:", error);
    showNotification("Failed to complete donation", "error");
  }
}

// Mark donation as received
async function markDonationReceived(donationId) {
  try {
    const response = await fetch(`/api/donations/${donationId}/received`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const result = await response.json();
      showNotification(
        result.message || "Donation marked as received!",
        "success"
      );
      closeModal("donationModal");
      await loadAcceptedDonations();
      await updateStatistics();
    } else {
      const error = await response.json();
      showNotification(
        error.message || "Failed to mark donation as received",
        "error"
      );
    }
  } catch (error) {
    console.error("Failed to mark donation as received:", error);
    showNotification("Failed to mark donation as received", "error");
  }
}

// Handle create task form submission
document
  .getElementById("createTaskForm")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(createTaskForm);
    const taskData = {
      title: formData.get("title"),
      description: formData.get("description"),
      location: formData.get("location"),
      date: formData.get("date"),
      type: formData.get("type"),
    };

    // Check if this task is linked to a donation
    const donationId = createTaskModal.getAttribute("data-donation-id");

    try {
      const response = await fetch("/api/volunteers/create-task", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...taskData,
          ...(donationId && { donationId }), // Add donationId if it exists
        }),
      });

      if (response.ok) {
        showNotification("Volunteer task created successfully!", "success");
        closeModal("createTaskModal");
        createTaskForm.reset();
        // Clear the donation ID attribute
        createTaskModal.removeAttribute("data-donation-id");
        await loadVolunteerTasks();
      } else {
        const error = await response.json();
        showNotification(error.message || "Failed to create task", "error");
      }
    } catch (error) {
      console.error("Failed to create task:", error);
      showNotification("Failed to create task", "error");
    }
  });