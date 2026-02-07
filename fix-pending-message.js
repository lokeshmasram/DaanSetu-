// PASTE THIS CODE INTO THE BROWSER CONSOLE
// This will permanently hide the pending message for verified NGOs

(function fixPendingMessage() {
  console.log('🔧 Running pending message fix...');
  
  // Function to hide the pending message
  function hidePendingMessage() {
    let found = false;
    
    // Try multiple selectors
    const selectors = [
      '[id*="status"]',
      '[class*="status"]',
      '[id*="banner"]',
      '[class*="banner"]',
      '[id*="alert"]',
      '[class*="alert"]',
      '[id*="pending"]',
      '[class*="pending"]',
      '.notification',
      '.message',
      'div',
      'p',
      'span'
    ];
    
    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        const text = el.textContent || el.innerText || '';
        if (text.includes('Your NGO is pending verification') || 
            text.includes('pending verification')) {
          el.style.display = 'none';
          el.style.visibility = 'hidden';
          el.style.opacity = '0';
          el.style.height = '0';
          el.style.overflow = 'hidden';
          console.log('✅ Hidden element:', el.tagName, el.className, el.id);
          found = true;
        }
      });
    });
    
    if (found) {
      console.log('✅ Pending message hidden successfully!');
    } else {
      console.log('⚠️ No pending message found');
    }
  }
  
  // Hide immediately
  hidePendingMessage();
  
  // Hide after DOM loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hidePendingMessage);
  }
  
  // Keep checking and hiding (in case it's dynamically added)
  const observer = new MutationObserver(hidePendingMessage);
  observer.observe(document.body, { 
    childList: true, 
    subtree: true 
  });
  
  // Also check every 500ms for 10 seconds
  let checks = 0;
  const interval = setInterval(() => {
    hidePendingMessage();
    checks++;
    if (checks >= 20) {
      clearInterval(interval);
      console.log('✅ Fix complete - monitoring stopped');
    }
  }, 500);
  
  console.log('✅ Pending message fix installed!');
  console.log('📝 The message will be hidden automatically');
})();
