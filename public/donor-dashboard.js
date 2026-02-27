// Initialize Socket.IO
const socket = io();

// Cancel donation function - defined early so it's available globally
async function cancelDonation(donationId) {
  try {
    console.log("🚫 Attempting to cancel donation:", donationId);
    
    if (!confirm('Are you sure you want to cancel this donation? This action cannot be undone.')) {
      console.log("❌ User cancelled the cancellation");
      return;
    }

    const token = localStorage.getItem("token");
    const res = await fetch(`/api/donations/${donationId}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      }
    });

    const result = await res.json();
    console.log("📡 Cancel API response:", result);

    if (!res.ok) {
      throw new Error(result.message || "Failed to cancel donation");
    }

    showNotification("Donation cancelled successfully", "success");
    
    // Reload donations and update statistics
    await loadMyDonations();
    await updateStatistics();
  } catch (error) {
    console.error("❌ Cancel donation error:", error);
    showNotification(error.message || "Failed to cancel donation", "error");
  }
}

// Make cancelDonation available globally immediately
window.cancelDonation = cancelDonation;

// Global test function for debugging
window.testStatButton = function(category) {
  console.log("🧪 Test function called with category:", category);
  console.log("   window.viewDonationDetails exists:", typeof window.viewDonationDetails === 'function');
  if (typeof window.viewDonationDetails === 'function') {
    window.viewDonationDetails(category);
  } else {
    console.error("❌ viewDonationDetails function not found on window!");
    console.error("   Available window functions:", Object.keys(window).filter(k => typeof window[k] === 'function' && k.includes('view')));
  }
};

// Global variables
let currentUser = null;
let donorData = null;

// DOM elements
const donorNameElement = document.getElementById("donorName");
const statusBanner = document.getElementById("statusBanner");
const statusMessage = document.getElementById("statusMessage");
const donationsList = document.getElementById("donationsList");
const refreshDonationsBtn = document.getElementById("refreshDonations");
const newDonationBtn = document.getElementById("newDonationBtn");
const logoutBtn = document.getElementById("logoutBtn");
const newDonationModal = document.getElementById("newDonationModal");
const newDonationForm = document.getElementById("newDonationForm");
const donationModal = document.getElementById("donationModal");
const donationDetails = document.getElementById("donationDetails");
const notificationToast = document.getElementById("notificationToast");
const toastMessage = document.getElementById("toastMessage");

// Statistics elements
const totalDonationsElement = document.getElementById("totalDonations");
const completedDonationsElement = document.getElementById("completedDonations");
const pendingDonationsElement = document.getElementById("pendingDonations");
const cancelledDonationsElement = document.getElementById("cancelledDonations");
const ngosHelpedElement = document.getElementById("ngosHelped");

// Initialize dashboard
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Donor Dashboard - Initializing...");
  console.log("   window.viewDonationDetails =", typeof window.viewDonationDetails);
  console.log("   window.openDetailView =", typeof window.openDetailView);
  console.log("   window.testStatButton =", typeof window.testStatButton);
  
  await checkAuth();
  await loadDonorData();
  await loadMyDonations();
  await updateStatistics();
  setupEventListeners();
  setupSocketListeners();
  
  // These should be available by now due to hoisting
  console.log("   After init - window.viewDonationDetails =", typeof window.viewDonationDetails);
  console.log("   After init - window.openDetailView =", typeof window.openDetailView);
  console.log("✅ Donor Dashboard - Initialization complete");
});

// Check authentication
async function checkAuth() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/";
    return;
  }

  try {
    const res = await fetch("/api/auth/profile", {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      localStorage.removeItem("token");
      window.location.href = "/";
      return;
    }

    const data = await res.json();
    currentUser = data.user;
  } catch (error) {
    console.error("Auth check error:", error);
    localStorage.removeItem("token");
    window.location.href = "/";
  }
}

// Open a dedicated donation details page in a new tab/window
function openDonationPage(donationId) {
  try {
    console.log("🔗 Opening donation details page for:", donationId);
    
    if (!donationId) {
      console.error("❌ No donation ID provided");
      return;
    }
    
    const url = `/donation-details.html?id=${encodeURIComponent(donationId)}`;
    console.log("🎯 Navigating to:", url);
    
    // Open in same window
    window.location.href = url;
  } catch (error) {
    console.error("❌ Error opening donation page:", error);
    showNotification("Failed to open donation details", "error");
  }
}

// Load donor data
async function loadDonorData() {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch("/api/auth/profile", {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error("Failed to load donor profile");

    const data = await res.json();
    donorData = data.user;
    donorNameElement.textContent = donorData.name || donorData.email;
  } catch (error) {
    console.error("Load donor data error:", error);
    donorNameElement.textContent = "Donor";
  }
}

// Setup event listeners
function setupEventListeners() {
  // Setup stat button click handlers
  const statButtons = document.querySelectorAll('.stat-clickable');
  console.log(`📊 Found ${statButtons.length} stat buttons`);
  
  statButtons.forEach((btn, index) => {
    const category = btn.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
    console.log(`   Button ${index + 1}: category="${category}"`);
    
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log(`✅ Stat button clicked - category: ${category}`);
      if (category) {
        await viewDonationDetails(category);
      }
    });
  });

  refreshDonationsBtn?.addEventListener("click", async () => {
    await loadMyDonations();
    showNotification("Donations refreshed", "success", 2000);
  });

  newDonationBtn?.addEventListener("click", () => {
    showModal("newDonationModal");
  });

  logoutBtn?.addEventListener("click", async () => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/";
    }
  });

  if (newDonationForm) {
    newDonationForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      await createDonation();
    });
  }
}

// Setup Socket.IO listeners
function setupSocketListeners() {
  socket.on("connect", () => {
    console.log("Connected to server");
  });

  socket.on("donation-created", async (donation) => {
    showNotification("New donation received", "success");
    await loadMyDonations();
    await updateStatistics();
  });

  socket.on("donation-updated", async (donation) => {
    showNotification("A donation was updated", "info");
    await loadMyDonations();
    await updateStatistics();
  });

  socket.on("donation-completed", async (donation) => {
    showNotification("Your donation was completed!", "success");
    await loadMyDonations();
    await updateStatistics();
  });

  socket.on("disconnect", () => {
    console.log("Disconnected from server");
  });
}

// Utility functions
function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove("hidden");
  
  // Initialize donation map if opening the donation modal
  if (modalId === "newDonationModal") {
    setTimeout(() => {
      initializeDonationMap();
    }, 300);
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add("hidden");
}

function showNotification(message, type = "info", timeout = 5000) {
  notificationToast.textContent = message;
  notificationToast.className = `notification-toast ${type}`;
  notificationToast.classList.remove("hidden");

  setTimeout(() => {
    notificationToast.classList.add("hidden");
  }, timeout);
}

// Initialize Google Map for donation form
let donationMap = null;
let donationMapMarker = null;

function initializeDonationMap(retryCount = 0) {
  const mapContainer = document.getElementById("donationMap");
  if (!mapContainer) {
    console.error("Donation map container not found");
    return;
  }
  
  // Don't reinitialize if already done
  if (donationMap) return;

  // Check if Google Maps is loaded, if not retry
  if (typeof google === "undefined" || !google.maps) {
    if (retryCount < 3) {
      console.log(`Google Maps not yet loaded, retrying... (attempt ${retryCount + 1}/3)`);
      setTimeout(() => initializeDonationMap(retryCount + 1), 500);
      return;
    }
    
    // Fallback: Show coordinate input instead of map
    console.warn("Google Maps not available. Using coordinate input fallback.");
    showDonationMapFallback(mapContainer);
    return;
  }

  // Default location (center of India)
  const defaultLocation = { lat: 20.5937, lng: 78.9629 };

  donationMap = new google.maps.Map(mapContainer, {
    zoom: 12,
    center: defaultLocation,
    mapTypeControl: true,
    fullscreenControl: true,
    streetViewControl: false,
  });

  // Add click listener to map to select location
  donationMap.addListener("click", (e) => {
    setDonationMapMarker(e.latLng);
  });

  // Try to get user's current location
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        donationMap.setCenter(userLocation);
        setDonationMapMarker(userLocation);
        document.getElementById("location").value = `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`;
      },
      () => {
        // Geolocation failed, use default location
        setDonationMapMarker(defaultLocation);
      }
    );
  } else {
    setDonationMapMarker(defaultLocation);
  }
}

function setDonationMapMarker(latlng) {
  if (!donationMap) return;

  if (donationMapMarker) {
    donationMapMarker.setMap(null);
  }

  // Accept either google.maps.LatLng with lat()/lng() or plain {lat, lng} numbers
  let pos;
  if (latlng && typeof latlng.lat === "function" && typeof latlng.lng === "function") {
    pos = latlng;
  } else if (latlng && (typeof latlng.lat === "number" || typeof latlng.lat === "string")) {
    pos = new google.maps.LatLng(Number(latlng.lat), Number(latlng.lng));
  } else {
    console.warn("setDonationMapMarker: invalid latlng", latlng);
    return;
  }

  donationMapMarker = new google.maps.Marker({
    position: pos,
    map: donationMap,
    title: "Donation Location",
  });

  // Update location input (support both LatLng and plain objects)
  try {
    const latVal = typeof pos.lat === "function" ? pos.lat() : pos.lat;
    const lngVal = typeof pos.lng === "function" ? pos.lng() : pos.lng;
    document.getElementById("location").value = `${Number(latVal).toFixed(4)}, ${Number(lngVal).toFixed(4)}`;
  } catch (e) {
    console.warn("Could not update location input", e);
  }

  // Center map on marker
  donationMap.setCenter(pos);
}

// Fallback UI when Google Maps is not available
function showDonationMapFallback(container) {
  container.innerHTML = `
    <div style="padding: 20px; background: #f5f5f5; border-radius: 8px; border: 1px solid #ddd;">
      <p style="color: #666; margin-bottom: 16px; font-size: 14px;">
        <strong>Map unavailable</strong> - Enter your donation location coordinates below:
      </p>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
        <div>
          <label style="display: block; font-size: 13px; color: #333; margin-bottom: 6px;">Latitude</label>
          <input 
            id="fallback-latitude" 
            type="number" 
            placeholder="e.g., 28.6139" 
            step="0.0001"
            style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;"
          />
        </div>
        <div>
          <label style="display: block; font-size: 13px; color: #333; margin-bottom: 6px;">Longitude</label>
          <input 
            id="fallback-longitude" 
            type="number" 
            placeholder="e.g., 77.2090" 
            step="0.0001"
            style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;"
          />
        </div>
      </div>
      <button 
        onclick="setFallbackLocation()"
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

// Set location from fallback coordinate inputs
function setFallbackLocation() {
  const lat = document.getElementById('fallback-latitude')?.value;
  const lng = document.getElementById('fallback-longitude')?.value;
  
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
  
  // Update the location field
  document.getElementById('location').value = `${latNum.toFixed(4)}, ${lngNum.toFixed(4)}`;
  showNotification('Location set to: ' + document.getElementById('location').value, 'success');
}

// Close modals with Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document.querySelectorAll(".modal").forEach((modal) => {
      modal.classList.add("hidden");
    });
  }
});

// Load my donations
async function loadMyDonations() {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch("/api/donations/history", {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error("Failed to load donations");

    const result = await res.json();
    const donations = Array.isArray(result.donations) ? result.donations : [];

    console.log("📦 Loaded donations:", donations.length);
    console.log("📊 Donation statuses:", donations.map(d => ({ id: d.id?.substring(0, 8), status: d.status })));

    // Show ALL donations (completed, pending, cancelled, etc.)
    renderDonationsList(donations);
    
    // Initialize impact map
    setTimeout(() => {
      initializeImpactMap();
    }, 100);
  } catch (error) {
    console.error("Load my donations error:", error);
    donationsList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-circle"></i>
        <p>Error loading donations</p>
      </div>
    `;
  }
}

// Load completed donations
// Update statistics
async function updateStatistics() {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch("/api/donations/history", {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error("Failed to load statistics");

    const result = await res.json();
    const donations = Array.isArray(result.donations) ? result.donations : [];

    console.log("📊 UPDATE STATISTICS - Total donations:", donations.length);
    console.log("📊 All donation statuses:", donations.map(d => d.status));

    const totalCount = donations.length;
    const completedCount = donations.filter(d => d.status === "completed").length;
    const pendingDonations = donations.filter(d => 
      d.status === "pending" || d.status === "available" || d.status === "accepted" || d.status === "picked_up" || d.status === "received"
    );
    const pendingCount = pendingDonations.length;
    const cancelledCount = donations.filter(d => 
      d.status === "cancelled" || d.status === "rejected"
    ).length;

    console.log("📊 PENDING DONATIONS:", pendingDonations);
    console.log("📊 COUNTS - Total:", totalCount, "Completed:", completedCount, "Pending:", pendingCount, "Cancelled:", cancelledCount);

    // Get unique NGOs helped
    const ngosHelped = new Set(
      donations
        .filter(d => (d.status === "accepted" || d.status === "picked_up" || d.status === "received" || d.status === "completed") && d.matchedNgoId)
        .map(d => d.matchedNgoId)
    ).size;

    if (totalDonationsElement) totalDonationsElement.textContent = totalCount;
    if (completedDonationsElement) completedDonationsElement.textContent = completedCount;
    if (pendingDonationsElement) pendingDonationsElement.textContent = pendingCount;
    if (cancelledDonationsElement) cancelledDonationsElement.textContent = cancelledCount;
    if (ngosHelpedElement) ngosHelpedElement.textContent = ngosHelped;

    console.log("✅ Statistics updated in DOM");
  } catch (error) {
    console.error("❌ Update statistics error:", error);
  }
}

// Render donations list
function renderDonationsList(donations) {
  if (!donations.length) {
    donationsList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-inbox"></i>
        <p>No donations yet</p>
      </div>
    `;
    return;
  }

  donationsList.innerHTML = donations
    .map(
      (donation) => {
        // Check if donation can be cancelled (status is pending, available, or not accepted)
        const canCancel = donation.status === 'pending' || 
                         (donation.status === 'available' && !donation.matchedNgoId) ||
                         (!donation.matchedNgoId && donation.status !== 'completed' && donation.status !== 'cancelled');
        
        console.log(`🎯 Donation ${donation.id?.substring(0, 8)}: status=${donation.status}, canCancel=${canCancel}`);
        
        return `
        <div class="donation-item ${donation.status}">
          <div class="donation-header">
            <div class="donation-title">${donation.itemType}</div>
            <div class="donation-distance">
              ${getStatusText(donation.status)}
            </div>
          </div>
          <div class="donation-details">
            <p><i class="fas fa-box"></i> Quantity: ${donation.quantity}</p>
            <p><i class="fas fa-map-marker-alt"></i> ${donation.pickupAddress || "Location TBA"}</p>
            ${
              donation.matchedNgoId
                ? `<p><i class="fas fa-building"></i> ${donation.ngoName || "Assigned NGO"}</p>`
                : '<p><i class="fas fa-clock"></i> Awaiting NGO assignment</p>'
            }
            <p><i class="fas fa-calendar"></i> ${formatDate(donation.createdAt)}</p>
          </div>
          <div class="donation-actions">
            <button class="btn-secondary btn-small" onclick="event.stopPropagation(); openDonationPage('${donation.id}')">
              View Details
            </button>
            ${canCancel ? `
            <button class="btn-danger btn-small" onclick="event.stopPropagation(); window.cancelDonation('${donation.id}')" title="Cancel this donation">
              <i class="fas fa-times"></i> Cancel
            </button>
            ` : ''}
          </div>
        </div>
      `;
      }
    )
    .join("");
}

// Render completed donations
// Show donation details
async function showDonationDetails(donationId) {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/donations/details/${donationId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error("Failed to load donation details");

    const result = await res.json();
    const donation = result.donation;

    donationDetails.innerHTML = `
      <div class="detail-item">
        <div class="detail-label">Item Type</div>
        <div class="detail-value">${donation.itemType}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Quantity</div>
        <div class="detail-value">${donation.quantity}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Category</div>
        <div class="detail-value">${donation.category || "N/A"}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Pickup Address</div>
        <div class="detail-value">${donation.pickupAddress || "TBA"}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Description</div>
        <div class="detail-value">${donation.description || "No description"}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Status</div>
        <div class="detail-value">${getStatusText(donation.status)}</div>
      </div>
      ${
        donation.matchedNgoId
          ? `
        <div class="detail-item">
          <div class="detail-label">Matched NGO</div>
          <div class="detail-value">${donation.ngoName || "Unknown"}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">NGO Email</div>
          <div class="detail-value">${donation.ngoEmail || "N/A"}</div>
        </div>
      `
          : ""
      }
      <div class="detail-item">
        <div class="detail-label">Created</div>
        <div class="detail-value">${formatDate(donation.createdAt)}</div>
      </div>
    `;

    showModal("donationModal");
  } catch (error) {
    console.error("Show donation details error:", error);
    showNotification("Failed to load donation details", "error");
  }
}

// Create donation
async function createDonation() {
  try {
    const token = localStorage.getItem("token");
    const formData = new FormData(newDonationForm);

    const locationValue = formData.get("location");
    let coordinates = null;
    let pickupAddress = locationValue;
    
    // Try to parse coordinates from location input if in format "lat, lng" or "lat,lng"
    if (locationValue) {
      const coordsMatch = locationValue.trim().match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
      if (coordsMatch) {
        const lat = parseFloat(coordsMatch[1]);
        const lng = parseFloat(coordsMatch[2]);
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          coordinates = { lat, lng };
          pickupAddress = `${lat}, ${lng}`;
          console.log("✅ Parsed coordinates from location:", coordinates);
        }
      }
    }
    
    if (!coordinates) {
      console.warn("⚠️ No valid coordinates found in location. Donation won't be visible to NGOs!");
      console.warn("   Please enter location as 'latitude, longitude' (e.g., '20.7459, 78.6028')");
      
      const proceed = confirm(
        "⚠️ WARNING: No valid coordinates detected!\\n\\n" +
        "Without coordinates, NGOs cannot see your donation.\\n\\n" +
        "Please enter location as: latitude, longitude\\n" +
        "Example: 20.7459, 78.6028\\n\\n" +
        "Do you want to go back and fix this?"
      );
      
      if (proceed) {
        // User wants to fix it
        return;
      }
    }

    const donationData = {
      itemType: formData.get("itemType"),
      quantity: formData.get("quantity"),
      category: formData.get("category"),
      description: formData.get("description"),
      pickupAddress: pickupAddress
    };
    
    // Only add coordinates if they were successfully parsed
    if (coordinates) {
      donationData.coordinates = coordinates;
    }

    console.log("📤 Sending donation data:", donationData);

    const res = await fetch("/api/donations/list", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(donationData)
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Failed to create donation");
    }

    closeModal("newDonationModal");
    newDonationForm.reset();
    
    if (coordinates) {
      showNotification("Donation created successfully! NGOs in your area will be notified.", "success");
    } else {
      showNotification("Donation created, but no coordinates set. Please add coordinates for NGO visibility.", "warning", 8000);
    }
    
    await loadMyDonations();
    await updateStatistics();
  } catch (error) {
    console.error("Create donation error:", error);
    showNotification(error.message || "Failed to create donation", "error");
  }
}

// Get status text
function getStatusText(status) {
  const statusMap = {
    available: "Available",
    pending: "Pending",
    accepted: "Accepted",
    picked_up: "Picked Up",
    received: "Received",
    matched: "Matched",
    "in-progress": "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
    rejected: "Rejected"
  };
  return statusMap[status] || status;
}

// Format date
function formatDate(firebaseDate) {
  if (!firebaseDate) return "N/A";
  
  let date;
  if (firebaseDate._seconds) {
    date = new Date(firebaseDate._seconds * 1000);
  } else if (firebaseDate.seconds) {
    date = new Date(firebaseDate.seconds * 1000);
  } else if (typeof firebaseDate === "string") {
    date = new Date(firebaseDate);
  } else {
    date = new Date(firebaseDate);
  }

  if (isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

// View donation details by category
async function viewDonationDetails(category) {
  try {
    console.log("🔍 viewDonationDetails called with category:", category);
    
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("❌ No token found");
      showNotification("Please login first", "error");
      return;
    }

    console.log("📡 Fetching donations from API...");
    const res = await fetch("/api/donations/history", {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      console.error("❌ API Error:", res.status, res.statusText);
      throw new Error("Failed to load donations");
    }

    const result = await res.json();
    console.log("✅ API Response received:", result);
    
    const donations = Array.isArray(result.donations) ? result.donations : [];
    console.log("📊 Total donations loaded:", donations.length);

    // Check if any donations need NGO name enrichment (fallback if backend didn't do it)
    const needsEnrichment = donations.some(d => d.matchedNgoId && !d.ngoName);
    
    if (needsEnrichment) {
      console.log("🔄 Enriching donations with NGO names (frontend fallback)...");
      for (let donation of donations) {
        if (donation.matchedNgoId && !donation.ngoName) {
          try {
            const ngoRes = await fetch(`/api/ngos/details/${donation.matchedNgoId}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (ngoRes.ok) {
              const ngoData = await ngoRes.json();
              donation.ngoName = ngoData.ngo?.name || "Unknown NGO";
            } else {
              donation.ngoName = "Unknown NGO";
            }
          } catch (err) {
            console.error("❌ Error fetching NGO name:", err);
            donation.ngoName = "Unknown NGO";
          }
        }
      }
      console.log("✅ NGO names enriched");
    }
    
    // Set default for unmatched donations
    donations.forEach(d => {
      if (!d.ngoName) {
        d.ngoName = d.matchedNgoId ? "Unknown NGO" : "Not Assigned";
      }
    });

    let filteredDonations = [];
    let pageTitle = "";

    switch (category) {
      case "total":
        filteredDonations = donations;
        pageTitle = "All Donations";
        break;
      case "completed":
        filteredDonations = donations.filter(d => d.status === "completed");
        pageTitle = "Completed Donations";
        break;
      case "pending":
        filteredDonations = donations.filter(d => 
          d.status === "pending" || d.status === "available" || d.status === "accepted" || d.status === "picked_up" || d.status === "received"
        );
        console.log("🔍 PENDING FILTER - All statuses:", donations.map(d => d.status));
        console.log("🔍 PENDING FILTER - Filtered count:", filteredDonations.length);
        console.log("🔍 PENDING FILTER - Filtered donations:", filteredDonations);
        pageTitle = "Pending Donations";
        break;
      case "cancelled":
        filteredDonations = donations.filter(d => 
          d.status === "cancelled" || d.status === "rejected"
        );
        pageTitle = "Cancelled Donations";
        break;
      case "ngos-helped":
        // Get unique NGOs
        const ngosSet = new Set();
        const ngosData = [];
        donations
          .filter(d => (d.status === "accepted" || d.status === "picked_up" || d.status === "received" || d.status === "completed") && d.matchedNgoId)
          .forEach(d => {
            if (!ngosSet.has(d.matchedNgoId)) {
              ngosSet.add(d.matchedNgoId);
              
              // Count accepted/active and completed donations for this NGO
              const ngoStats = {
                matchedCount: donations.filter(
                  donation => donation.matchedNgoId === d.matchedNgoId && 
                  (donation.status === "accepted" || donation.status === "picked_up" || donation.status === "received")
                ).length,
                completedCount: donations.filter(
                  donation => donation.matchedNgoId === d.matchedNgoId && 
                  donation.status === "completed"
                ).length
              };
              
              // Calculate total donations to this NGO
              const totalDonations = donations.filter(
                donation => donation.matchedNgoId === d.matchedNgoId
              ).length;
              
              // Find the most recent donation
              const ngoMatches = donations.filter(donation => donation.matchedNgoId === d.matchedNgoId);
              const lastDonation = ngoMatches.length > 0 ? ngoMatches[0].completedAt || ngoMatches[0].createdAt : null;
              
              ngosData.push({
                id: d.matchedNgoId,
                ngoName: d.ngoName || "Unknown NGO",
                matchedCount: ngoStats.matchedCount,
                completedCount: ngoStats.completedCount,
                totalDonations: totalDonations,
                lastDonation: lastDonation
              });
            }
          });
        
        pageTitle = "NGOs Helped";
        console.log("🏢 NGOs Data prepared:", ngosData);
        
        // Open NGOs helped details page
        openDetailView(pageTitle, ngosData, "ngos-helped");
        return;
      default:
        pageTitle = "Donations";
    }

    console.log(`📋 Filtered donations (${category}):`, filteredDonations.length);
    
    // Open donations detail view with the correct category type
    openDetailView(pageTitle, filteredDonations, category);
  } catch (error) {
    console.error("❌ View donation details error:", error);
    showNotification("Failed to load details: " + error.message, "error");
  }
}

// Make viewDonationDetails available globally
window.viewDonationDetails = viewDonationDetails;
window.viewDonationDetailsByCategory = viewDonationDetails; // Alias for HTML compatibility

// Open detail view page
function openDetailView(pageTitle, data, type) {
  try {
    console.log("🔄 Opening detail view...");
    console.log("   Title:", pageTitle);
    console.log("   Type:", type);
    console.log("   Data count:", Array.isArray(data) ? data.length : "N/A");
    
    // Verify data is JSON serializable
    let dataStr = "";
    try {
      dataStr = JSON.stringify(data);
      console.log("✅ Data is JSON serializable, size:", dataStr.length, "bytes");
    } catch (e) {
      console.error("❌ Data is not JSON serializable:", e);
      showNotification("Error: Data format not supported", "error");
      return;
    }
    
    // Store data in sessionStorage to pass to detail page
    try {
      sessionStorage.setItem("detailViewTitle", pageTitle);
      sessionStorage.setItem("detailViewData", dataStr);
      sessionStorage.setItem("detailViewType", type);
      
      // Verify data was stored
      const storedData = sessionStorage.getItem("detailViewData");
      console.log("✅ Data stored in sessionStorage, verification:", !!storedData);
    } catch (e) {
      console.error("❌ sessionStorage error:", e);
      showNotification("Error: Could not store data", "error");
      return;
    }

    console.log("✅ All data validated and stored");
    console.log("🚀 Navigating to /donor-detail-view.html...");
    
    // Navigate to detail view page
    const url = "/donor-detail-view.html";
    console.log("   URL:", url);
    
    // Use setTimeout to ensure logs are flushed before navigation
    setTimeout(() => {
      window.location.href = url;
    }, 100);
    
  } catch (error) {
    console.error("❌ Error opening detail view:", error);
    console.error("   Error details:", error.message, error.stack);
    showNotification("Failed to open detail view: " + error.message, "error");
  }
}

// Make openDetailView available globally
window.openDetailView = openDetailView;

// Initialize Impact Map with donation locations
let impactMap = null;
let impactMapMarkers = [];

async function initializeImpactMap() {
  try {
    const mapContainer = document.getElementById("impactMapContainer");
    if (!mapContainer) return;

    // If Google Maps failed to load, show a helpful message
    if (typeof google === "undefined" || !google.maps) {
      console.error("Google Maps JavaScript API not available");
      const placeholder = document.getElementById("mapPlaceholder");
      if (placeholder) {
        placeholder.innerHTML = `
          <div style="text-align:center;max-width:420px;color:#666;">
            <div style="font-size:16px;font-weight:600;margin-bottom:8px;">Map failed to load</div>
            <div style="font-size:13px;">Google Maps API is not available. Check your API key.</div>
          </div>
        `;
      }
      return;
    }

    // Default location (center of India)
    const defaultLocation = { lat: 20.5937, lng: 78.9629 };

    // Initialize the map
    impactMap = new google.maps.Map(mapContainer, {
      zoom: 12,
      center: defaultLocation,
      mapTypeControl: true,
      fullscreenControl: true,
      streetViewControl: false,
    });

    // Fetch user's donations
    const token = localStorage.getItem('token');
    if (!token) return;

    const res = await fetch("/api/donations/history", {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      console.error('Failed to fetch donations for map');
      return;
    }

    const result = await res.json();
    const allDonations = Array.isArray(result.donations) ? result.donations : [];
    
    // Filter for COMPLETED donations only
    const donations = allDonations.filter(d => d.status === 'completed');

    // Clear existing markers
    impactMapMarkers.forEach(marker => marker.setMap(null));
    impactMapMarkers = [];

    if (donations.length === 0) {
      const placeholder = document.getElementById("mapPlaceholder");
      if (placeholder) {
        placeholder.innerHTML = `
          <div style="text-align:center;max-width:420px;color:#999;">
            <i class="fas fa-check-circle" style="font-size:2rem;margin-bottom:0.5rem;"></i>
            <p>No completed donations yet</p>
            <p style="font-size:12px;margin-top:8px;">Completed donations will appear here</p>
          </div>
        `;
      }
      return;
    }

    // Hide placeholder
    const placeholder = document.getElementById("mapPlaceholder");
    if (placeholder) placeholder.style.display = 'none';

    // Add markers for each completed donation with coordinates
    let bounds = new google.maps.LatLngBounds();
    let hasValidCoordinates = false;

    donations.forEach((donation) => {
      // Try to parse coordinates from pickupAddress or use coordinates field
      let lat, lng;

      if (donation.coordinates && donation.coordinates.lat && donation.coordinates.lng) {
        lat = donation.coordinates.lat;
        lng = donation.coordinates.lng;
      } else if (donation.pickupAddress) {
        // Try to parse coordinates from address like "20.5937, 78.9629"
        const coordMatch = donation.pickupAddress.match(/(-?\\d+\\.\\d+),\\s*(-?\\d+\\.\\d+)/);
        if (coordMatch) {
          lat = parseFloat(coordMatch[1]);
          lng = parseFloat(coordMatch[2]);
        }
      }

      if (lat && lng) {
        hasValidCoordinates = true;
        const location = { lat, lng };
        bounds.extend(location);

        // Green marker for completed donations
        const marker = new google.maps.Marker({
          position: location,
          map: impactMap,
          title: `${donation.itemType} - Completed`,
          icon: `http://maps.google.com/mapfiles/ms/icons/green-dot.png`
        });

        // Add click listener to show donation info
        marker.addListener('click', () => {
          new google.maps.InfoWindow({
            content: `
              <div style="padding:12px;font-size:13px;max-width:200px;">
                <div style="font-weight:bold;color:#2e7d32;margin-bottom:8px;">
                  <i class="fas fa-check-circle"></i> Completed
                </div>
                <div style="margin-bottom:6px;">
                  <strong>Item:</strong> ${donation.itemType}
                </div>
                <div style="margin-bottom:6px;">
                  <strong>Quantity:</strong> ${donation.quantity}
                </div>
                ${donation.ngoName ? `
                  <div style="margin-bottom:6px;">
                    <strong>NGO:</strong> ${donation.ngoName}
                  </div>
                ` : ''}
                ${donation.completedAt ? `
                  <div style="font-size:11px;color:#666;margin-top:8px;">
                    Completed: ${new Date(donation.completedAt).toLocaleDateString()}
                  </div>
                ` : ''}
              </div>
            `
          }).open(impactMap, marker);
        });

        impactMapMarkers.push(marker);
      }
    });

    // Fit map to bounds if we have valid coordinates
    if (hasValidCoordinates && impactMapMarkers.length > 0) {
      impactMap.fitBounds(bounds);
    } else if (!hasValidCoordinates) {
      const placeholder = document.getElementById("mapPlaceholder");
      if (placeholder) {
        placeholder.innerHTML = `
          <div style="text-align:center;max-width:420px;color:#999;">
            <i class="fas fa-map-marker-alt" style="font-size:2rem;margin-bottom:0.5rem;"></i>
            <p>Completed donations without location data</p>
          </div>
        `;
      }
    }

  } catch (error) {
    console.error('Error initializing impact map:', error);
    const placeholder = document.getElementById("mapPlaceholder");
    if (placeholder) {
      placeholder.innerHTML = `
        <div style="text-align:center;max-width:420px;color:#e53e3e;">
          <i class="fas fa-exclamation-circle" style="font-size:2rem;margin-bottom:0.5rem;"></i>
          <p>Error loading map</p>
        </div>
      `;
    }
  }
}

