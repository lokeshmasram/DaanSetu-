# Google Maps API Setup for DaanSetu

## Quick Setup (5 minutes)

### Step 1: Get a Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Maps JavaScript API**:
   - Search for "Maps JavaScript API" in the API search box
   - Click "Enable"
4. Create an API key:
   - Go to "Credentials" in the left menu
   - Click "Create Credentials" → "API Key"
   - Copy your API key

### Step 2: Set the API Key in Browser

#### Option A: Using the Helper Function (Easiest)
1. Open the donor dashboard: `http://localhost:3000/donor-dashboard`
2. Open browser console (Press F12, then go to Console tab)
3. Run this command:
   ```javascript
   setGoogleMapsKey('YOUR_API_KEY_HERE')
   ```
4. Replace `YOUR_API_KEY_HERE` with your actual API key
5. Press Enter - the page will reload automatically and maps will work!

#### Option B: Manual Setup
1. Open browser console (Press F12)
2. Run:
   ```javascript
   localStorage.setItem('G_MAPS_KEY', 'YOUR_API_KEY_HERE');
   location.reload();
   ```

### Step 3: Test the Map

- Navigate to the Donor Dashboard
- Scroll to the "Your Impact Map" section
- You should see a map with your donation locations

## Features That Use Google Maps

1. **Donation Form**: Map to select donation location
2. **Impact Map**: Shows all your donation locations on a map
3. **NGO Dashboard**: Map showing available donations nearby
4. **Volunteer Dashboard**: Task locations on map

## API Key Restrictions (Production)

For security, restrict your API key to:
- **Application restrictions**: HTTP referrers
- **API restrictions**: Only "Maps JavaScript API"
- Add your domain(s) to the allowed referrers list

## Troubleshooting

### Map shows "Map failed to load"
- Check that your API key is correct
- Verify the Maps JavaScript API is enabled in Google Cloud Console
- Check browser console for error messages (F12)

### Map shows placeholder text
- Refresh the page after setting the API key
- Clear browser cache (Ctrl+Shift+Delete)
- Verify localStorage has the key: `localStorage.getItem('G_MAPS_KEY')`

### API Key not working
- Verify the key is correct (no extra spaces)
- Check if the Maps JavaScript API is enabled
- Try enabling the Places API library too (Maps JavaScript API includes this)
- Wait a few minutes - new API keys take time to activate

## Need Help?

Check your browser console for detailed error messages:
1. Press F12 to open Developer Tools
2. Go to the "Console" tab
3. Look for any error messages starting with "Failed to load Google Maps"
4. Search the error message in [Google Maps API documentation](https://developers.google.com/maps/documentation)

## For Production Deployment

Instead of using localStorage, you should:
1. Add your API key to environment variables in the backend
2. Create a protected endpoint that returns the API key
3. Load the Maps script from the backend (server-side rendering)

Example `.env` addition:
```
GOOGLE_MAPS_API_KEY=your-production-api-key
```

Then in your backend, serve the Maps script with the key included.
