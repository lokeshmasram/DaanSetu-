// ============================================================================
// PERMANENT FIX FOR NGO PENDING VERIFICATION MESSAGE
// ============================================================================
// 
// INSTRUCTIONS:
// 1. Open: public/ngo-dashboard.js
// 2. Find the FIRST line (should be: const socket = io();)
// 3. Paste THIS ENTIRE CODE right BEFORE that first line
// 4. Save the file
// 5. Done! The fix will work permanently for all NGOs
//
// ============================================================================

// Auto-hide pending verification banner for verified NGOs
(function() {
  'use strict';
  
  console.log('🔧 NGO Status Banner Fix loaded');
  
  // Function to check status and hide banner
  function checkAndHideBanner() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('token');
    
    // Only run for NGO users
    if (user.userType !== 'ngo' || !token) {
      console.log('Not an NGO user, skipping banner check');
      return;
    }
    
    console.log('Checking NGO status for banner...');
    
    // Fetch current status from server
    fetch('/api/ngos/status', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => response.json())
    .then(data => {
      console.log('NGO Status:', data.status);
      
      if (data.success && data.status === 'verified') {
        // NGO is verified - hide the banner
        const statusBanner = document.getElementById('statusBanner');
        if (statusBanner) {
          statusBanner.style.display = 'none';
          console.log('✅ Status banner hidden - NGO is verified');
        }
        
        // Also update localStorage if needed
        if (user.status !== 'verified') {
          user.status = 'verified';
          localStorage.setItem('user', JSON.stringify(user));
          console.log('✅ Updated cached status to verified');
        }
      } else if (data.status === 'pending_verification') {
        // NGO is pending - show the banner
        const statusBanner = document.getElementById('statusBanner');
        if (statusBanner) {
          statusBanner.style.display = 'block';
          console.log('⏳ Status banner shown - NGO is pending verification');
        }
      }
    })
    .catch(error => {
      console.error('Error checking NGO status:', error);
    });
  }
  
  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAndHideBanner);
  } else {
    // DOM already loaded, run immediately
    checkAndHideBanner();
  }
  
  // Also check after a short delay (in case DOM elements load late)
  setTimeout(checkAndHideBanner, 500);
  setTimeout(checkAndHideBanner, 1000);
  
  // Listen for real-time verification events (if socket is available)
  setTimeout(function() {
    if (typeof socket !== 'undefined') {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.uid) {
        socket.emit('join-ngo-room', user.uid);
        socket.on('ngo-verified', function(data) {
          console.log('🎉 NGO verified event received!');
          const statusBanner = document.getElementById('statusBanner');
          if (statusBanner) {
            statusBanner.style.display = 'none';
          }
          user.status = 'verified';
          localStorage.setItem('user', JSON.stringify(user));
          if (typeof showNotification === 'function') {
            showNotification('Your NGO has been verified!', 'success');
          }
          setTimeout(() => location.reload(), 2000);
        });
      }
    }
  }, 1000);
  
  // Periodic check every 30 seconds (backup)
  setInterval(checkAndHideBanner, 30000);
  
  console.log('✅ NGO Status Banner Fix initialized');
})();

// ============================================================================
// END OF PERMANENT FIX
// ============================================================================
