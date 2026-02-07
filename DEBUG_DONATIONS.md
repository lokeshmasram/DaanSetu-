# Debug Guide - Donations Not Showing

## Issue
Recent donations are not showing up in the donor dashboard.

## Quick Diagnostic Steps

### Step 1: Check Browser Console
1. Open the donor dashboard
2. Press **F12** to open DevTools
3. Go to **Console** tab
4. Look for these messages:

**Expected messages:**
```
Loading donation history...
Token exists: true
Response status: 200
Donation history result: {success: true, donations: [...]}
Number of donations: X
Rendering donation history, count: X
```

**If you see errors:**
- Note the exact error message
- Check which step failed

### Step 2: Check if Donations Exist in Database
The donations might not exist in Firestore. Let me help you verify.

### Step 3: Check User ID
In browser console, run:
```javascript
JSON.parse(localStorage.getItem('user'))
```

Copy the `uid` value - this is your donor ID.

### Step 4: Verify Token
In browser console, run:
```javascript
localStorage.getItem('token')
```

Should return a long JWT token string.

## Common Issues & Solutions

### Issue 1: "Number of donations: 0"
**Cause:** No donations in database for this donor
**Solution:** Create a test donation first

### Issue 2: Token error or 401 Unauthorized
**Cause:** Token expired or invalid
**Solution:** 
1. Logout
2. Login again
3. Try again

### Issue 3: 403 Forbidden
**Cause:** User type mismatch
**Solution:** Verify you're logged in as a donor, not NGO

### Issue 4: Network error
**Cause:** Server not running or wrong port
**Solution:** 
1. Check server is running: `node server.js`
2. Verify URL is `http://localhost:3001`

## Test by Creating a Donation

### Step 1: Create Test Donation
1. On donor dashboard, click **"New Donation"**
2. Fill in the form:
   - Item Type: Food
   - Quantity: 5 bags
   - Description: Test donation
   - Click on map to select location
3. Click **"Create Donation"**

### Step 2: Verify It Appears
1. Look at "Recent Donations" section
2. Should see your new donation immediately
3. Status should be "Available" (blue badge)

## API Endpoint Test

You can test the API directly in browser console:

```javascript
fetch('/api/donations/history', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  }
})
.then(r => r.json())
.then(data => console.log('API Response:', data))
.catch(err => console.error('API Error:', err))
```

**Expected response:**
```json
{
  "success": true,
  "donations": [
    {
      "id": "...",
      "itemType": "food",
      "quantity": "5 bags",
      "status": "available",
      ...
    }
  ]
}
```

## Server-Side Check

Check server console for these logs:
```
Donation history request: { userId: '...', userType: 'donor' }
Fetching donations for donor: ...
Returning donations: X
```

If you see:
```
Returning donations: 0
```

Then no donations exist for this donor in the database.

## Database Query

The backend queries Firestore with:
```javascript
db.collection("donations")
  .where("donorId", "==", userId)
  .get()
```

This means donations must have a `donorId` field matching your user ID.

## Quick Fix Steps

1. **Refresh the page** - Sometimes helps
2. **Clear browser cache** - Ctrl+Shift+Delete
3. **Logout and login again** - Refreshes token
4. **Create a new donation** - Test if new ones appear
5. **Check server logs** - See what's happening backend

## If Still Not Working

### Collect This Information:
1. Browser console output (screenshot)
2. Server console output (copy text)
3. User ID from localStorage
4. Response from API test above
5. Any error messages

### Then Check:
- Is the server running on port 3001?
- Are you logged in as a donor (not NGO)?
- Does the database have donations for this donor?
- Is the token valid?

## Expected Behavior

**When working correctly:**
1. Dashboard loads
2. Console shows: "Loading donation history..."
3. API call succeeds (status 200)
4. Donations array returned
5. Donations rendered in UI
6. You see donation cards in "Recent Donations"

**Each donation card shows:**
- Item type and quantity
- Status badge (Available/Accepted/Completed)
- Location
- Posted date
- NGO name (if accepted)

---

**Next Steps:**
1. Open browser console (F12)
2. Refresh the donor dashboard
3. Check the console messages
4. Report what you see
