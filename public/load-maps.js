// Runtime loader for Google Maps JavaScript API.
// Behavior:
// - If `localStorage.G_MAPS_KEY` exists, it will load the Maps script using that key.
// - If no key is found, it will show a setup dialog to enter one.

(function () {
  function createSetupDialog() {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'gmap-setup-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.background = 'rgba(0,0,0,0.5)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = 999999;

    // Create dialog
    const dialog = document.createElement('div');
    dialog.style.background = '#fff';
    dialog.style.borderRadius = '8px';
    dialog.style.padding = '32px';
    dialog.style.maxWidth = '500px';
    dialog.style.width = '90%';
    dialog.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
    dialog.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    dialog.innerHTML = `
      <h2 style="margin: 0 0 16px 0; color: #333; font-size: 24px;">Google Maps Setup Required</h2>
      <p style="color: #666; margin: 0 0 20px 0; line-height: 1.5;">
        Google Maps API key is not configured. Paste your API key below to enable map features.
      </p>
      <input 
        id="gmap-key-input" 
        type="password" 
        placeholder="Paste your Google Maps API key here..." 
        style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box; margin-bottom: 16px;"
      />
      <p style="color: #999; font-size: 12px; margin: 0 0 20px 0;">
        Don't have a key? <a href="https://console.cloud.google.com/" target="_blank" style="color: #1976d2; text-decoration: none;">Create one here</a>
      </p>
      <div style="display: flex; gap: 12px;">
        <button id="gmap-save-btn" style="flex: 1; padding: 12px; background: #1976d2; color: white; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; font-weight: 600;">
          Save & Reload
        </button>
        <button id="gmap-skip-btn" style="flex: 1; padding: 12px; background: #f0f0f0; color: #333; border: none; border-radius: 6px; font-size: 14px; cursor: pointer;">
          Skip for Now
        </button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.addEventListener('DOMContentLoaded', () => document.body.appendChild(overlay));

    // Wait for DOM ready to attach listeners
    const setupListeners = () => {
      const input = document.getElementById('gmap-key-input');
      const saveBtn = document.getElementById('gmap-save-btn');
      const skipBtn = document.getElementById('gmap-skip-btn');

      if (!input || !saveBtn || !skipBtn) {
        setTimeout(setupListeners, 100);
        return;
      }

      input.focus();

      saveBtn.addEventListener('click', () => {
        const key = input.value.trim();
        if (key) {
          localStorage.setItem('G_MAPS_KEY', key);
          location.reload();
        } else {
          alert('Please enter a valid API key');
        }
      });

      skipBtn.addEventListener('click', () => {
        overlay.remove();
      });

      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveBtn.click();
      });
    };

    setupListeners();
  }

  const key = localStorage.getItem('G_MAPS_KEY') || 'AIzaSyCl52pIJABoETCVhdNvk2GdhNq44O_xNv0';

  if (!key) {
    console.warn('Google Maps API key not found in localStorage. Showing setup dialog.');
    createSetupDialog();
    return;
  }

  // Build script URL (include places library by default)
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places`;
  script.async = true;
  script.defer = true;
  script.onload = function () {
    console.info('Google Maps script loaded');
  };
  script.onerror = function (e) {
    console.error('Failed to load Google Maps script. Check the key and console for API errors.', e);
    // If loading fails, show banner with further instructions
    createBanner();
  };

  document.head.appendChild(script);
})();
