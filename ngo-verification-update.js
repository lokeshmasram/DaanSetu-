/**
 * NGO Verification Status Update Handler
 * 
 * Add this code to public/ngo-dashboard.js to automatically remove
 * the "pending verification" message when admin verifies the NGO.
 * 
 * INSTRUCTIONS:
 * 1. Copy this entire code
 * 2. Paste it at the end of public/ngo-dashboard.js
 * 3. Make sure Socket.IO is already initialized in your dashboard
 */

// ============================================================================
// REAL-TIME VERIFICATION STATUS HANDLER
// ============================================================================

(function() {
  'use strict';

  // Get socket instance (assumes socket.io is already loaded and connected)
  const socket = io();
  
  // Get user data from localStorage
  let user = JSON.parse(localStorage.getItem('user') || '{}');
  
  /**
   * Hide all verification alerts (both red and info banners)
   */
  function hideAllVerificationAlerts() {
    const banners = document.querySelectorAll('.status-banner, [class*="pending"], [id*="pending"], [class*="banner"]');
    banners.forEach(element => {
      // Check if it's a verification-related banner
      const text = (element.textContent || element.innerText || '').toLowerCase();
      if (text.includes('verification') || text.includes('pending') || text.includes('rejected') || text.includes('verified')) {
        element.style.display = 'none';
        console.log('✅ Hidden verification banner');
      }
    });
  }

  /**
   * Update user status in localStorage
   */
  function updateUserStatus(newStatus) {
    user.status = newStatus;
    localStorage.setItem('user', JSON.stringify(user));
    console.log('✅ User status updated to:', newStatus);
  }

  /**
   * Check NGO verification status from API
   */
  async function checkVerificationStatus() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found, skipping status check');
        return;
      }

      const response = await fetch('/api/ngos/status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      console.log('NGO Status Check Response:', data);
      
      if (data.success && data.status === 'verified') {
        // Status changed to verified
        if (user.status !== 'verified') {
          console.log('🎉 NGO has been verified!');
          updateUserStatus('verified');
          hideAllVerificationAlerts();
          
          // Show success notification if showNotification function exists
          if (typeof showNotification === 'function') {
            showNotification('Your NGO has been verified by the admin!', 'success');
          }
          
          // Reload page after 2 seconds to show full dashboard
          setTimeout(() => {
            console.log('Reloading page to show verified dashboard...');
            location.reload();
          }, 2000);
        } else {
          // Already verified, ensure banners are hidden
          hideAllVerificationAlerts();
        }
      } else if (data.status === 'rejected') {
        // Status is rejected
        if (user.status !== 'rejected') {
          console.log('❌ NGO has been rejected!');
          updateUserStatus('rejected');
          // Reload to show rejection banner
          setTimeout(() => location.reload(), 500);
        }
      } else if (data.status === 'pending_verification') {
        console.log('NGO still pending verification');
        // For pending verification, hide banners for newly registered NGOs
        const ngoData = data.ngo;
        if (ngoData && ngoData.createdAt) {
          const createdAt = ngoData.createdAt;
          const registrationTime = createdAt._seconds ? 
            new Date(createdAt._seconds * 1000) : 
            new Date(createdAt);
          
          const timeSinceRegistration = Date.now() - registrationTime.getTime();
          const hoursSinceRegistration = timeSinceRegistration / (1000 * 60 * 60);
          
          // Hide banners for newly registered NGOs (less than 1 hour old)
          if (hoursSinceRegistration <= 1) {
            hideAllVerificationAlerts();
          }
        }
      }
    } catch (error) {
      console.error('Error checking verification status:', error);
    }
  }

  /**
   * Handle real-time verification event from Socket.IO
   */
  function handleVerificationEvent(data) {
    console.log('🎉 Received verification event:', data);
    
    updateUserStatus('verified');
    hideAllVerificationAlerts();
    
    // Show success notification
    if (typeof showNotification === 'function') {
      showNotification(data.message || 'Your NGO has been verified!', 'success');
    } else {
      alert(data.message || 'Your NGO has been verified!');
    }
    
    // Reload page after 2 seconds
    setTimeout(() => {
      console.log('Reloading page to show verified dashboard...');
      location.reload();
    }, 2000);
  }

  /**
   * Handle real-time rejection event from Socket.IO
   */
  function handleRejectionEvent(data) {
    console.log('❌ Received rejection event:', data);
    
    updateUserStatus('rejected');
    
    // Reload to show rejection banner
    setTimeout(() => location.reload(), 500);
  }

  /**
   * Initialize verification status monitoring
   */
  function initVerificationMonitoring() {
    console.log('🔄 Initializing NGO verification status monitoring...');
    
    // Join NGO-specific Socket.IO room
    if (user.uid) {
      socket.emit('join-ngo-room', user.uid);
      console.log('Joined NGO room:', user.uid);
    }
    
    // Listen for verification events
    socket.on('ngo-verified', handleVerificationEvent);
    
    // Listen for rejection events
    socket.on('ngo-rejected', handleRejectionEvent);
    
    // Check status immediately on load
    checkVerificationStatus();
    
    // Check status periodically (every 30 seconds)
    setInterval(checkVerificationStatus, 30000);
    
    // Hide banners if already verified
    if (user.status === 'verified') {
      hideAllVerificationAlerts();
    }
    
    console.log('✅ Verification monitoring initialized');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVerificationMonitoring);
  } else {
    initVerificationMonitoring();
  }

  // Also expose functions globally for debugging
  window.ngoVerificationHandler = {
    checkStatus: checkVerificationStatus,
    hidePendingAlert: hideAllVerificationAlerts,
    updateUserStatus: updateUserStatus
  };

})();

// ============================================================================
// END OF VERIFICATION STATUS HANDLER
// ============================================================================

console.log('✅ NGO Verification Status Handler loaded');