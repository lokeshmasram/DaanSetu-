// Initialize Socket.IO connection
const socket = io();

// Global variables
let currentUser = null;
let userToken = localStorage.getItem("token");

// Check authentication state on page load
document.addEventListener("DOMContentLoaded", async () => {
  if (userToken) {
    await checkAuthState();
  }
  updateUI();
  initPasswordToggles();
});

// Check if user is authenticated and get user info
async function checkAuthState() {
  try {
    const response = await fetch("/api/auth/profile", {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      currentUser = data.user;
      console.log("User authenticated:", currentUser);
    } else {
      // Token is invalid, clear it
      localStorage.removeItem("token");
      userToken = null;
      currentUser = null;
    }
  } catch (error) {
    console.error("Auth check failed:", error);
    localStorage.removeItem("token");
    userToken = null;
    currentUser = null;
  }
}

// Update UI based on authentication state
function updateUI() {
  const navMenu = document.querySelector(".nav-menu");
  const heroButtons = document.querySelector(".hero-buttons");
  const quickAccessSection = document.getElementById("quick-access");

  if (currentUser) {
    // Hide quick access section for logged-in users
    if (quickAccessSection) {
      quickAccessSection.style.display = "none";
    }
    // User is logged in - show personalized navigation
    navMenu.innerHTML = `
            <li><a href="#about">About</a></li>
            <li><a href="#how-it-works">How It Works</a></li>
            <li><a href="/${currentUser.userType}-dashboard">My Dashboard</a></li>
            <li><a href="#" onclick="logout()">Logout (${currentUser.name})</a></li>
        `;

    // Update hero buttons based on user type
    if (currentUser.userType === "donor") {
      heroButtons.innerHTML = `
                <button class="btn btn-primary" onclick="window.location.href='/donor-dashboard'">Go to Dashboard</button>
                <button class="btn btn-secondary" onclick="showDonationModal()">Make a Donation</button>
            `;
    } else if (currentUser.userType === "ngo") {
      heroButtons.innerHTML = `
                <button class="btn btn-primary" onclick="window.location.href='/ngo-dashboard'">Go to Dashboard</button>
                <button class="btn btn-secondary" onclick="window.location.href='/ngo-dashboard'">View Donations</button>
            `;
    } else if (currentUser.userType === "volunteer") {
      heroButtons.innerHTML = `
                <button class="btn btn-primary" onclick="window.location.href='/volunteer-dashboard'">Go to Dashboard</button>
                <button class="btn btn-secondary" onclick="window.location.href='/volunteer-dashboard'">View Tasks</button>
            `;
    } else if (currentUser.userType === "admin") {
      heroButtons.innerHTML = `
                <button class="btn btn-primary" onclick="window.location.href='/admin-dashboard'">Admin Dashboard</button>
                <button class="btn btn-secondary" onclick="window.location.href='/admin-dashboard'">Manage Platform</button>
            `;
    }

    // Update hero title for personalized experience
    const heroTitle = document.querySelector(".hero-title");
    const heroSubtitle = document.querySelector(".hero-subtitle");

    if (currentUser.userType === "donor") {
      heroTitle.textContent = `Welcome back, ${currentUser.name}!`;
      heroSubtitle.textContent =
        "Ready to make a difference? Your donations help NGOs serve communities in need.";
    } else if (currentUser.userType === "ngo") {
      heroTitle.textContent = `Welcome, ${currentUser.name}`;
      heroSubtitle.textContent =
        "Check your dashboard for new donation opportunities in your area.";
    } else if (currentUser.userType === "volunteer") {
      heroTitle.textContent = `Hello, ${currentUser.name}!`;
      heroSubtitle.textContent =
        "Ready to help? Check out available volunteer tasks from NGOs.";
    } else if (currentUser.userType === "admin") {
      heroTitle.textContent = `Admin Dashboard - ${currentUser.name}`;
      heroSubtitle.textContent =
        "Manage NGO verifications and monitor platform activity.";
    }
  } else {
    // User is not logged in - show default navigation
    navMenu.innerHTML = `
            <li><a href="#about">About</a></li>
            <li><a href="#how-it-works">How It Works</a></li>
            <li><a href="#" onclick="showLoginModal()">Login</a></li>
            <li><a href="#" onclick="showRegistrationModal()">Register</a></li>
        `;

    heroButtons.innerHTML = `
            <button class="btn btn-primary" onclick="showLoginModal()">Login to Donate</button>
            <button class="btn btn-secondary" onclick="showRegistrationModal()">Register as NGO/Volunteer</button>
        `;

    // Show quick access section for non-logged in users
    if (quickAccessSection) {
      quickAccessSection.style.display = "block";
    }
  }
}

// Logout function
function logout() {
  localStorage.removeItem("token");
  userToken = null;
  currentUser = null;
  updateUI();
  showNotification("Logged out successfully!", "success");

  // Reset hero content
  const heroTitle = document.querySelector(".hero-title");
  const heroSubtitle = document.querySelector(".hero-subtitle");
  heroTitle.textContent = "Connecting Kindness, One Donation at a Time";
  heroSubtitle.textContent =
    "Donate food, clothes, or supplies in bulk - we connect you with NGOs who need them most.";
}

// DOM Elements
const loginModal = document.getElementById("loginModal");
const registrationModal = document.getElementById("registrationModal");
const donationModal = document.getElementById("donationModal");
const forgotPasswordModal = document.getElementById("forgotPasswordModal");

// Modal functions
function showLoginModal() {
  loginModal.style.display = "block";
}

function showRegistrationModal() {
  registrationModal.style.display = "block";
}

function showDonationModal() {
  if (!userToken) {
    alert("Please login first to make a donation");
    showLoginModal();
    return;
  }
  donationModal.style.display = "block";
}

function showForgotPasswordModal() {
  forgotPasswordModal.style.display = "block";
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = "none";
}

// Close modal when clicking outside
window.onclick = function (event) {
  if (event.target.classList.contains("modal")) {
    event.target.style.display = "none";
  }
};

// Form submissions
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  const submitBtn = e.target.querySelector('button[type="submit"]');

  // Show loading state
  submitBtn.textContent = "Logging in...";
  submitBtn.disabled = true;

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (data.success) {
      // Store token and user data in localStorage
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      currentUser = data.user;
      userToken = data.token;

      console.log("✅ Login successful, user data saved:", data.user);

      closeModal("loginModal");

      // Show success message for 3 seconds with green background
      showNotification("Login Successful!", "success", 3000);

      // Redirect based on user type
      setTimeout(() => {
        if (data.user.userType === "donor") {
          window.location.href = "/donor-dashboard";
        } else if (data.user.userType === "ngo") {
          window.location.href = "/ngo-dashboard";
        } else if (data.user.userType === "volunteer") {
          window.location.href = "/volunteer-dashboard";
        } else if (data.user.userType === "admin") {
          window.location.href = "/admin-dashboard";
        }
      }, 1000);
    } else {
      // Show error message for 3 seconds with red background
      showNotification("Wrong Credentials", "error", 3000);
    }
  } catch (error) {
    console.error("Login error:", error);
    // Show error message for 3 seconds with red background
    showNotification("Wrong Credentials", "error", 3000);
  } finally {
    // Reset button state
    submitBtn.textContent = "Login";
    submitBtn.disabled = false;
  }
});

document
  .getElementById("registrationForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const userType = document.getElementById("userType").value;
    const name = document.getElementById("regName").value;
    const email = document.getElementById("regEmail").value;
    const phone = document.getElementById("regPhone").value;
    const address = document.getElementById("regAddress").value;
    const password = document.getElementById("regPassword").value;
    const submitBtn = e.target.querySelector('button[type="submit"]');

    // Show loading state
    submitBtn.textContent = "Registering...";
    submitBtn.disabled = true;

    const registrationData = {
      userType,
      name,
      email,
      phone,
      address,
      password,
    };

    if (userType === "ngo") {
      const registrationId = document.getElementById("regId").value;
      registrationData.registrationId = registrationId;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registrationData),
      });

      const data = await response.json();

      if (data.success) {
        showNotification(data.message || "Registration successful!", "success");
        closeModal("registrationModal");

        if (userType === "ngo") {
          showNotification(
            "Your NGO registration has been submitted and is pending verification. You will be notified once verified.",
            "info"
          );
        }

        // Auto-login after successful registration
        localStorage.setItem("token", data.token);
        currentUser = data.user;
        userToken = data.token;

        // Redirect after a short delay
        setTimeout(() => {
          if (data.user.userType === "donor") {
            window.location.href = "/donor-dashboard";
          } else if (data.user.userType === "ngo") {
            window.location.href = "/ngo-dashboard";
          } else if (data.user.userType === "volunteer") {
            window.location.href = "/volunteer-dashboard";
          }
        }, 2000);
      } else {
        showNotification(data.message || "Registration failed", "error");
      }
    } catch (error) {
      console.error("Registration error:", error);
      showNotification("Registration failed. Please try again.", "error");
    } finally {
      // Reset button state
      submitBtn.textContent = "Register";
      submitBtn.disabled = false;
    }
  });

document
  .getElementById("donationForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const itemType = document.getElementById("itemType").value;
    const quantity = document.getElementById("quantity").value;
    const description = document.getElementById("description").value;
    const pickupAddress = document.getElementById("pickupAddress").value;

    // Get coordinates from address (simplified - in real app, use geocoding service)
    const coordinates = await getCoordinatesFromAddress(pickupAddress);

    try {
      const response = await fetch("/api/donations/list", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          itemType,
          quantity: parseInt(quantity),
          description,
          pickupAddress,
          coordinates,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(
          `Donation listed successfully! ${data.nearbyNgos} nearby NGOs have been notified.`
        );
        closeModal("donationModal");
        document.getElementById("donationForm").reset();
      } else {
        alert(data.message || "Failed to list donation");
      }
    } catch (error) {
      console.error("Donation error:", error);
      alert("Failed to list donation. Please try again.");
    }
  });

document
  .getElementById("forgotPasswordForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("forgotEmail").value;
    const submitBtn = e.target.querySelector('button[type="submit"]');

    // Show loading state
    submitBtn.textContent = "Sending...";
    submitBtn.disabled = true;

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Backend always returns success: true for security reasons
      // Show the message from backend (which is always the same for security)
      alert(data.message || "If an account with that email exists, a password reset link has been sent.");
      closeModal("forgotPasswordModal");
      document.getElementById("forgotPasswordForm").reset();
    } catch (error) {
      console.error("Forgot password error:", error);
      alert("Failed to send reset link. Please try again.");
    } finally {
      // Reset button state
      submitBtn.textContent = "Send Reset Link";
      submitBtn.disabled = false;
    }
  });

// Handle user type selection in registration form
document.getElementById("userType").addEventListener("change", function () {
  const ngoFields = document.querySelectorAll(".ngo-only");
  const userType = this.value;

  ngoFields.forEach((field) => {
    if (userType === "ngo") {
      field.style.display = "block";
      field.querySelector("input").required = true;
    } else {
      field.style.display = "none";
      field.querySelector("input").required = false;
    }
  });
});

// Helper function to get coordinates from address (simplified)
async function getCoordinatesFromAddress(address) {
  // In a real application, you would use a geocoding service like Google Maps API
  // For now, return mock coordinates
  return {
    lat: 28.6139 + (Math.random() - 0.5) * 0.1, // Delhi area with some randomness
    lng: 77.209 + (Math.random() - 0.5) * 0.1,
  };
}

// Socket.IO event listeners
socket.on("connect", () => {
  console.log("Connected to server");
});

socket.on("new-donation", (donation) => {
  if (currentUser && currentUser.userType === "ngo") {
    showNotification(
      `New donation available: ${donation.itemType} - ${donation.quantity} items`,
      donation
    );
  }
});

socket.on("donation-accepted", (data) => {
  if (currentUser && currentUser.userType === "donor") {
    showNotification(
      `Your donation has been accepted by ${data.ngoName}! Contact: ${data.ngoPhone}`,
      data
    );
  }
});

// Notification function
function showNotification(message, type = "info", timeout = 3000) {
  // Create notification element
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;

  // Get icon based on type
  let icon = "ℹ️";
  if (type === "success") icon = "✅";
  if (type === "error") icon = "❌";
  if (type === "info") icon = "ℹ️";

  notification.innerHTML = `
        <div class="notification-content">
            <h4>${icon} ${message}</h4>

        </div>
    `;

  document.body.appendChild(notification);

  // Auto remove after specified timeout
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, timeout);
}

// Check if user is already logged in
if (userToken) {
  fetch("/api/auth/profile", {
    headers: {
      Authorization: `Bearer ${userToken}`,
    },
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        currentUser = data.user;
        // Update UI to show logged-in state
        updateUIForLoggedInUser();
      } else {
        localStorage.removeItem("token");
        userToken = null;
      }
    })
    .catch((error) => {
      console.error("Profile fetch error:", error);
      localStorage.removeItem("token");
      userToken = null;
    });
}

function updateUIForLoggedInUser() {
  if (currentUser) {
    // Update navigation
    const navMenu = document.querySelector(".nav-menu");
    const loginLink = navMenu.querySelector("li:last-child a");

    if (currentUser.userType === "ngo") {
      loginLink.textContent = "NGO Dashboard";
      loginLink.onclick = () => (window.location.href = "/ngo-dashboard");
    } else if (currentUser.userType === "donor") {
      loginLink.textContent = "Donor Dashboard";
      loginLink.onclick = () => (window.location.href = "/donor-dashboard");
    } else if (currentUser.userType === "volunteer") {
      loginLink.textContent = "Volunteer Dashboard";
      loginLink.onclick = () => (window.location.href = "/volunteer-dashboard");
    } else if (currentUser.userType === "admin") {
      loginLink.textContent = "Admin Dashboard";
      loginLink.onclick = () => (window.location.href = "/admin-dashboard");
    }
  }
}

// Join NGO room for real-time notifications
if (currentUser && currentUser.userType === "ngo") {
  socket.emit("join-ngo-room", currentUser.uid);
}

// Notification system
function showNotification(message, type = "info") {
  // Remove existing notifications
  const existingNotifications = document.querySelectorAll(".notification");
  existingNotifications.forEach((notification) => notification.remove());

  // Create notification element
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.innerHTML = `
        <div class="notification-content">
            <h4>${message}</h4>
            <button onclick="this.parentElement.parentElement.remove()">&times;</button>
        </div>
    `;

  // Add to page
  document.body.appendChild(notification);

  // Auto remove after 5 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 5000);
}

// Add notification styles
const notificationStyles = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease-out;
    }
    
    .notification-success {
        background-color: #10b981;
    }
    
    .notification-error {
        background-color: #ef4444;
    }
    
    .notification-info {
        background-color: #3b82f6;
    }
    
    .notification button {
        background: none;
        border: none;
        color: white;
        font-size: 18px;
        cursor: pointer;
        padding: 0;
        margin-left: auto;
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;

// Add styles to head
const styleSheet = document.createElement("style");
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);
// Quick login and redirect function
function loginAndRedirect(userType) {
  // Store the intended destination
  localStorage.setItem("intendedDestination", `/${userType}-dashboard`);
  showLoginModal();
}

// Initialize password visibility toggles for inputs that have a .toggle-password button
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
        if (icon) {
          icon.classList.remove('fa-eye');
          icon.classList.add('fa-eye-slash');
        }
      } else {
        input.type = 'password';
        btn.setAttribute('aria-label', 'Show password');
        const icon = btn.querySelector('i');
        if (icon) {
          icon.classList.remove('fa-eye-slash');
          icon.classList.add('fa-eye');
        }
      }
    });
  });
}

// Check for intended destination after login
function checkIntendedDestination() {
  const intendedDestination = localStorage.getItem("intendedDestination");
  if (intendedDestination) {
    localStorage.removeItem("intendedDestination");
    window.location.href = intendedDestination;
    return true;
  }
  return false;
}
// Add quick access button styles
const quickAccessStyles = `
    .btn-outline {
        background: transparent;
        border: 2px solid #3b82f6;
        color: #3b82f6;
        padding: 12px 24px;
        border-radius: 8px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s ease;
        text-decoration: none;
        display: inline-block;
    }
    
    .btn-outline:hover {
        background: #3b82f6;
        color: white;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }
    
    .quick-access-buttons {
        display: flex;
        gap: 20px;
        justify-content: center;
        flex-wrap: wrap;
        margin-top: 30px;
    }
    
    @media (max-width: 768px) {
        .quick-access-buttons {
            flex-direction: column;
            align-items: center;
        }
        
        .btn-outline {
            width: 200px;
            text-align: center;
        }
    }
`;

// Add quick access styles to head
const quickAccessStyleSheet = document.createElement("style");
quickAccessStyleSheet.textContent = quickAccessStyles;
document.head.appendChild(quickAccessStyleSheet);

// --- Pickup address autocomplete + map integration using Nominatim + Leaflet ---
let pickupMap, pickupMarker;
let pickupMapInitialized = false;
const pickupInput = document.getElementById('pickupAddress');
const pickupSuggestions = document.getElementById('pickupSuggestions');
const useCurrentLocationBtn = document.getElementById('useCurrentLocation');
const pickupLatInput = document.getElementById('pickupLat');
const pickupLngInput = document.getElementById('pickupLng');

function initPickupMap() {
  if (pickupMapInitialized) return;
  try {
    pickupMap = L.map('pickupMap');
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(pickupMap);

    // default view (India center)
    pickupMap.setView([20.5937,78.9629], 5);

    pickupMarker = L.marker([20.5937,78.9629], { draggable: true });
    pickupMarker.addTo(pickupMap);

    pickupMarker.on('dragend', async () => {
      const latlng = pickupMarker.getLatLng();
      pickupLatInput.value = latlng.lat;
      pickupLngInput.value = latlng.lng;
      await reverseGeocodeAndSetAddress(latlng.lat, latlng.lng);
    });

    pickupMapInitialized = true;
  } catch (err) {
    console.warn('Leaflet init failed:', err);
  }
}

function showPickupMap() {
  const mapDiv = document.getElementById('pickupMap');
  mapDiv.style.display = 'block';
  initPickupMap();
  setTimeout(() => { pickupMap.invalidateSize(); }, 200);
}

async function nominatimSearch(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=7`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) return [];
  return res.json();
}

async function reverseGeocodeAndSetAddress(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    if (data && data.display_name) {
      pickupInput.value = data.display_name;
    }
  } catch (err) {
    console.warn('Reverse geocode failed', err);
  }
}

let pickupDebounceTimer = null;
pickupInput.addEventListener('input', async (e) => {
  const q = e.target.value.trim();
  pickupLatInput.value = '';
  pickupLngInput.value = '';
  if (!q) { pickupSuggestions.innerHTML = ''; return; }
  // show map when user starts typing
  showPickupMap();
  clearTimeout(pickupDebounceTimer);
  pickupDebounceTimer = setTimeout(async () => {
    try {
      const results = await nominatimSearch(q);
      pickupSuggestions.innerHTML = '';
      results.forEach(r => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.textContent = r.display_name;
        item.addEventListener('click', () => {
          // set inputs and map
          pickupInput.value = r.display_name;
          pickupLatInput.value = r.lat;
          pickupLngInput.value = r.lon;
          pickupSuggestions.innerHTML = '';
          try {
            initPickupMap();
            pickupMap.setView([r.lat, r.lon], 16);
            pickupMarker.setLatLng([r.lat, r.lon]);
          } catch (err) { console.warn(err); }
        });
        pickupSuggestions.appendChild(item);
      });
    } catch (err) {
      console.warn('Search failed', err);
    }
  }, 300);
});

useCurrentLocationBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported by your browser');
    return;
  }
  navigator.geolocation.getCurrentPosition((pos) => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    pickupLatInput.value = lat;
    pickupLngInput.value = lon;
    showPickupMap();
    try {
      initPickupMap();
      pickupMap.setView([lat, lon], 16);
      pickupMarker.setLatLng([lat, lon]);
      reverseGeocodeAndSetAddress(lat, lon);
    } catch (err) { console.warn(err); }
  }, (err) => {
    console.warn('Geolocation error', err);
    alert('Unable to get your location');
  }, { enableHighAccuracy: true });
});

// Use pickupLat/pickupLng if available when submitting donation; fall back to geocoding
const origDonationHandler = document.querySelector('#donationForm').onsubmit;
// we already have an event listener for donationForm earlier; override getCoordinatesFromAddress to use Nominatim
async function getCoordinatesFromAddress(address) {
  // if hidden inputs populated, prefer those
  const lat = pickupLatInput.value;
  const lng = pickupLngInput.value;
  if (lat && lng) return { lat: parseFloat(lat), lng: parseFloat(lng) };
  if (!address) return null;
  try {
    const results = await nominatimSearch(address);
    if (results && results.length) {
      return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
    }
  } catch (err) {
    console.warn('Geocode failed', err);
  }
  return null;
}

