// ============================================================================
// COMPREHENSIVE NGO VERIFICATION STATUS FIX
// Add this code to the BEGINNING of public/ngo-dashboard.js
// ============================================================================

// Auto-check and update NGO verification status on page load
(function initNGOStatusCheck() {
  'use strict';
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');
  
  // Only run for NGO users
  if (user.userType !== 'ngo' || !token) return;
  
  console.log('🔍 Checking NGO verification status...');
  
  // Function to hide ALL verification alerts (both red and info banners)
  function hideAllVerificationAlerts() {
    // Wait for DOM to be ready
    setTimeout(() => {
      // More specific selectors to target status banners
      const banners = document.querySelectorAll('.status-banner, [id*="status"], [class*="banner"]');
      banners.forEach(element => {
        // Check if it's a verification-related banner
        const text = (element.textContent || element.innerText || '').toLowerCase();
        if (text.includes('verification') || text.includes('pending') || text.includes('rejected') || text.includes('verified')) {
          element.style.display = 'none';
          console.log('✅ Hidden verification banner');
        }
      });
    }, 100);
  }
  
  // Fetch current status from server
  fetch('/api/ngos/status', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    console.log('📊 Server status:', data.status);
    console.log('💾 Cached status:', user.status);
    
    if (data.success && data.status) {
      // Check if status changed
      if (user.status !== data.status) {
        console.log(`🔄 Status changed: ${user.status} → ${data.status}`);
        
        // Update localStorage
        user.status = data.status;
        localStorage.setItem('user', JSON.stringify(user));
        
        // If now verified, hide all banners and reload page to show full dashboard
        if (data.status === 'verified') {
          console.log('🎉 NGO is now verified! Hiding banners and reloading...');
          hideAllVerificationAlerts();
          setTimeout(() => location.reload(), 1000);
          return;
        }
        
        // If rejected, make sure the red banner is shown
        if (data.status === 'rejected') {
          // The dashboard will handle showing the red banner
          setTimeout(() => location.reload(), 500);
          return;
        }
      }
      
      // For verified NGOs, always hide banners
      if (data.status === 'verified') {
        hideAllVerificationAlerts();
      }
    }
  })
  .catch(error => {
    console.error('❌ Status check error:', error);
  });
  
  // Also hide banners on DOM ready if already verified
  if (user.status === 'verified') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', hideAllVerificationAlerts);
    } else {
      hideAllVerificationAlerts();
    }
  }
})();

// ============================================================================
// REAL-TIME VERIFICATION STATUS UPDATES
// Add this code to the END of public/ngo-dashboard.js
// ============================================================================

(function initRealTimeStatusUpdates() {
  'use strict';
  
  // Wait for socket to be available
  const waitForSocket = setInterval(() => {
    if (typeof io !== 'undefined' && typeof socket !== 'undefined') {
      clearInterval(waitForSocket);
      setupRealTimeUpdates();
    }
  }, 100);
  
  function setupRealTimeUpdates() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (user.userType !== 'ngo' || !user.uid) return;
    
    console.log('🔌 Setting up real-time verification updates...');
    
    // Join NGO-specific room
    socket.emit('join-ngo-room', user.uid);
    console.log('📡 Joined NGO room:', user.uid);
    
    // Listen for verification events
    socket.on('ngo-verified', function(data) {
      console.log('🎉 Received verification event!', data);
      
      // Update localStorage
      user.status = 'verified';
      localStorage.setItem('user', JSON.stringify(user));
      
      // Hide ALL verification banners
      document.querySelectorAll('.status-banner, [class*="pending"], [id*="pending"], [class*="banner"]').forEach(el => {
        const text = (el.textContent || '').toLowerCase();
        if (text.includes('verification') || text.includes('pending') || text.includes('rejected')) {
          el.style.display = 'none';
        }
      });
      
      // Show success notification
      if (typeof showNotification === 'function') {
        showNotification(data.message || 'Your NGO has been verified!', 'success');
      } else {
        alert(data.message || 'Your NGO has been verified!');
      }
      
      // Reload page after 2 seconds
      setTimeout(() => {
        console.log('🔄 Reloading to show verified dashboard...');
        location.reload();
      }, 2000);
    });
    
    // Listen for rejection events
    socket.on('ngo-rejected', function(data) {
      console.log('❌ Received rejection event!', data);
      
      // Update localStorage
      user.status = 'rejected';
      localStorage.setItem('user', JSON.stringify(user));
      
      // The dashboard will handle showing the red banner for rejection
      setTimeout(() => location.reload(), 500);
    });
    
    // Periodic status check (every 30 seconds as backup)
    setInterval(function() {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      fetch('/api/ngos/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(r => r.json())
      .then(d => {
        if (d.success && d.status === 'verified' && user.status !== 'verified') {
          console.log('🔄 Status changed to verified (periodic check)');
          user.status = 'verified';
          localStorage.setItem('user', JSON.stringify(user));
          // Hide banners and reload
          document.querySelectorAll('.status-banner').forEach(el => el.style.display = 'none');
          location.reload();
        } else if (d.success && d.status === 'rejected' && user.status !== 'rejected') {
          console.log('🔄 Status changed to rejected (periodic check)');
          user.status = 'rejected';
          localStorage.setItem('user', JSON.stringify(user));
          // Reload to show rejection banner
          setTimeout(() => location.reload(), 500);
        }
      })
      .catch(e => console.error('Periodic check error:', e));
    }, 30000);
    
    console.log('✅ Real-time updates initialized');
  }
})();

console.log('✅ NGO Status Fix loaded');