# Debugging Guide - Stat Button Navigation

## How to Test

1. **Open Browser Developer Console**
   - Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
   - Go to the **Console** tab

2. **Click on any stat button** (Total, Completed, Pending, Cancelled, or NGOs Helped)

3. **Check the console output** - You should see messages like:
   ```
   🔍 viewDonationDetails called with category: total
   📡 Fetching donations from API...
   ✅ API Response received: {donations: [...]}
   📊 Total donations loaded: X
   📋 Filtered donations (total): X
   🔄 Opening detail view...
      Title: All Donations
      Type: donations
      Data count: X
   ✅ Data stored in sessionStorage
   🚀 Navigating to /donor-detail-view.html...
   ```

## Common Issues & Solutions

### Issue 1: "❌ No token found"
**Solution**: Make sure you're logged in to the donor dashboard. The token is stored in localStorage.

### Issue 2: "❌ API Error: 404"
**Solution**: Check that your backend server is running and the `/api/donations/history` endpoint exists.

### Issue 3: "⚠️ Redirecting to donor-dashboard..."
**Solution**: The viewType is invalid. Check that sessionStorage is being set correctly before navigation.

### Issue 4: Page loads but no data shows
**Solution**: 
- Check if donations array is empty (it's normal if you haven't made donations)
- Look for errors in the console about rendering

## What Should Happen

1. ✅ Click stat button
2. ✅ Console shows debug logs with "✅" marks
3. ✅ Browser navigates to `/donor-detail-view.html`
4. ✅ Detail page loads and displays data in a table
5. ✅ Back button takes you back to dashboard

## If Still Not Working

Please share:
1. **What exactly happens when you click?** (Page stays same? Error message? etc)
2. **What's in the browser console?** (Any errors?)
3. **Are you logged in?** (Check if donor dashboard loads)
4. **Is your backend running?** (Check server logs)

## Quick Fix Checklist

- ✅ JavaScript enabled in browser
- ✅ Browser cache cleared (Ctrl+Shift+Delete)
- ✅ Logged into donor dashboard
- ✅ Backend server is running on port 3001
- ✅ No JavaScript errors in console (before clicking)
